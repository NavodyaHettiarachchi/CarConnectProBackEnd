const pool = require('../db/db');
const logController = require('../controllers/errorController');
const catchAsync = require('../utils/catchAsync');

// @ DESCRIPTION      => Get owner profile information
// @ ENDPOINT         => /profile/:userId
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.getProfile = catchAsync(async (req, res, next) => {
  const uId = req.params.userId;
  const result = await pool.query(`
    SELECT id, username, name, gender, dob, nic, street_1, street_2, city, province, email, phone, profile_pic, roles
    FROM person 
    WHERE id = $1
  `, [uId]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "success",
      showQuickNotification: true,
      message: "Invalid user id"
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved user profile successfully...",
    data: {
      userData: result.rows[0]
    }
  });
});

// @ DESCRIPTION      => Update owner profile information
// @ ENDPOINT         => /profile/:userId
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.updateProfile = catchAsync(async (req, res, next) => {
  let sql = `
      UPDATE "carConnectPro"."owner"
      Set
    `;
  let dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== id) {
      sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
      count++;
      dataArr.push(req.body[key]);
    }
  }

  sql = sql.substring(0, sql.length - 2);
  sq = sql.concat(" WHERE id = $", count.toString(), " RETURNING id, username, name, gender, dob, nic, street_1, street_2, city, province, email, phone, profile_pic, roles");
  dataArr.push(req.params.userId);

  const result = await pool.query(sql, dataArr);

  // logging
  let logObj = {
    id: req.params.userId,
    username: result.rows[0].username,
    type: "Vehicle Owner",
    action: "Update",
    updatedFields: req.body
  }
  await logController.logProfileChange(logObj, res, next);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Updated profile successfuly...",
    data: {
      userData: result.rows[0]
    }
  });
});

// @ DESCRIPTION      => Get all owner Vehicles
// @ ENDPOINT         => /vehicles
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.getVehicles = catchAsync(async (req, res, next) => {
  const owner_id = req.body.id;

  const result = await pool.query(`
    SELECT vt.vehicle_id, vt.number_plate, vt.model, vt.make, ot.reg_year FROM "carConnectPro"."owner_vehicle" as OT
    RIGHT JOIN "carConnectPro"."vehicles" AS vt
    ON ot.vehicle_id = vt.vehicle_id
    WHERE ot.owner_id = $1 
  `, [owner_id]);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved vehicles successfully...",
    data: {
      vehicles: result.rows,
    }
  });
});

// @ DESCRIPTION      => Get all owner Vehicles
// @ ENDPOINT         => /vehicles/:vehicleId
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.getVehicle = catchAsync(async (req, res, next) => {
  const owner_id = req.body.id;

  const result = await pool.query(`
    SELECT vt.vehicle_id, vt.number_plate, vt.model, vt.make, vt.service_history, ot.reg_year, o.name
    FROM "carConnectPro"."owner_vehicle" as OT
    RIGHT JOIN "carConnectPro"."vehicles" AS vt
    ON ot.vehicle_id = vt.vehicle_id
    JOIN "carConnectPro"."owner" AS o
    ON o.id = ot.owner_id
    WHERE ot.owner_id = $1 AND ot.vehicle_id = $2
  `, [owner_id, req.params.vehicleId]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "failed",
      showQuickNotification: true,
      message: "Invalid Vehicle ID..."
    });
  }

  return res.status(200).json({
    status: "succes",
    showQuickNotification: true,
    message: "Retrieved vehicles successfully...",
    data: {
      vehicles: result.rows[0],
    }
  });
});

// @ DESCRIPTION      => Get vehicle history
// @ ENDPOINT         => /vehicles/:vehicleId
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.getVehicleHistory = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
    SELECT service_history FROM "carConnectPro"."vehicles"
    WHERE vehicle_id = $1
  `, [req.params.vehicleId]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "failed",
      showQuickNotification: true,
      message: "Invalid Vehicle ID..."
    });
  }

  const recordObj = result.rows[0].service_history;
  let vehicleHistory = [];

  const queries = recordObj.map(async record => {
    const rec = await pool.query(`
      SELECT * FROM "${record.schema}"."service_records" AS st
      JOIN "${record.schema}"."clients" AS ct
      ON st.client_id = ct.id
      WHERE ct.vehicle_id = $1
    `, [req.params.vehicleId]);
    return rec.rows;
  });

  const results = await Promise.all(queries);

  results.forEach((row) => vehicleHistory.push(row));

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved service history successfully...",
    data: {
      serviceHistory: vehicleHistory,
    }
  });
});

// @ DESCRIPTION      => Get vehicle filtered history
// @ ENDPOINT         => /vehicles/:vehicleId/filter
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/16

exports.getFilteredHistory = catchAsync(async (req, res, next) => {
  const vehicle_id = req.params.vehicleId;

  const filterData = req.body.filterData;

  const result = await pool.query(`
    SELECT service_history FROM "carConnectPro"."vehicles"
    WHERE vehicle_id = $1
  `, [vehicle_id]);

  let recordObj = result.rows[0].service_history;
  if (filterData.center !== null) {
    const schema = await pool.query(`
      SELECT schema FROM "carConnectPro"."schema_mapping"
      WHERE username = $1
    `, [filterData.center.username])

    console.log('schema: ', schema, recordObj);
    recordObj = recordObj.filter(record => record.schema === schema.rows[0].schema);
    console.log('recordObj: ', recordObj);
  }
  let vehicleHistory = [];

  const queries = recordObj.map(async record => {
    const rec = await pool.query(`
      SELECT * FROM "${record.schema}"."service_records" AS st
      JOIN "${record.schema}"."clients" AS ct
      ON st.client_id = ct.id
      WHERE ct.vehicle_id = $1 
      AND st.service_date BETWEEN $2 AND $3
      AND st.mileage BETWEEN $4 AND $5
    `, [req.params.vehicleId, filterData.fromDate, filterData.toDate, filterData.mileage[0], filterData.mileage[1]]);
    return rec.rows;
  });

  const results = await Promise.all(queries);

  results.forEach((row) => vehicleHistory.push(row));

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved filtered history successfully...",
    data: {
      filteredHistory: vehicleHistory,
    }
  });

});