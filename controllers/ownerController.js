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
    SELECT vt.vehicle_id, vt.number_plate, vt.model, vt.make, ot.reg_year FROM "carConnectPro"."owner_vehicle" as OT
    RIGHT JOIN "carConnectPro"."vehicles" AS vt
    ON ot.vehicle_id = vt.vehicle_id
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

  const vehicleHistory = [];

  recordObj.records.forEach(async record => {
    const rec = await pool.query(`
      SELECT * FROM "${record.schema}"."service_records" AS st
      JOIN "${record.schema}"."clients" AS ct
      ON st.client_id = ct.id
      WHERE ct.vehicle_id = $1
    `, [req.params.vehicleId]);

    vehicleHistory.push(rec.rows);
  });

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved service history successfully...",
    data: {
      serviceHistory: vehicleHistory,
    }
  });
});