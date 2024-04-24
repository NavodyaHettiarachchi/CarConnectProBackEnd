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
    FROM "carConnectPro"."owner" 
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

exports.updateProfile = catchAsync(async (req, res) => { 
  const userId=req.params.userId;//@Harindu
  const { name, phone ,dob,gender , nic, city, province} = req.body;

  let sql = `
    UPDATE "carConnectPro"."owner"
    SET  name = $1, phone= $2 ,dob= $3,gender= $4 , nic= $5, city= $6, province= $7
    WHERE id = $8
    RETURNING id, username, name, email, phone ,dob,gender , nic, city, province`;

  // Set the values to be used in the SQL query
  const values = [name,phone,dob,gender , nic, city, province,userId];

  // let count = 1;
  // for (let key in req.body) {
  //   if (key !== userId) {
  //     sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
  //     count++;
  //     dataArr.push(req.body[key]);
  //   }
  // }


  // sql = sql.substring(0, sql.length - 2);
  // sq = sql.concat(" WHERE id = $", count.toString(), " RETURNING id, username, name, gender, dob, nic, street_1, street_2, city, province, email, phone, profile_pic, roles");
  // dataArr.push(req.params.userId);
try{
  const result = await pool.query(sql,values);

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
}catch (error) {
    return res.status(500).json({
      status: "error",
      showQuickNotification: true,
      message: "An error occurred while updating profile.",
      error: error.message
    });
  }
}

);


// @ DESCRIPTION      => Add owner Vehicle
// @ ENDPOINT         => /vehicles
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/19

exports.addVehicle = catchAsync(async (req, res, next) => { 

  // const {
  //   number_plate,
  //   model,
  //   make,
  //   engine_no,
  //   chassis_no,
  //   transmission_type,
  //   fuel_type,
  //   seating_capacity,
  //   mileage
  // } = req.body;

  // const files = req.files;

  // let dataArr = [
  //   number_plate,
  //   model,
  //   make,
  //   engine_no,
  //   chassis_no,
  //   transmission_type,
  //   fuel_type,
  //   seating_capacity,
  //   mileage
  // ];
  // let count = 10;
  // let valuesStr = `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9`;
  // let sql = `
  //   INSERT INTO "carConnectPro"."vehicles" (
  //     number_plate, model, make, engine_no, chassis_no, transmission_type, fuel_type, seating_capacity, mileage
  // `;

  // Object.values(files).forEach((fileArray) => {
  //   console.log(fileArray);
  //   if (Array.isArray(fileArray) && fileArray.length > 0) {
  //     const file = fileArray[0];
  //     sql = sql.concat(', ' + file.fieldname);
  //     dataArr.push(file.buffer);
  //     valuesStr = valuesStr.concat(", $" + (++count));
  //   }
  // });
  // sql = sql.concat(') ' + valuesStr +') RETURNING *');

  // const result = await pool.query(`
  //     ${sql}
  // `, dataArr);

  // const vehicle_id = result.rows[0].vehicle_id;

  // const result1 = await pool.query(`
  //   INSERT INTO "carConnectPro"."owner_vehicle" (owner_id, vehicle_id, reg_year)
  //   VALUES ($1, $2, $3);
  // `, [req.body.owner_id, vehicle_id, req.body.reg_year]);

  // return res.status(201).json({
  //   status: "success",
  //   showQuickNotification: true,
  //   message: "Vehicle added successfully",
  //   data: {
  //     vehicle: result.rows[0]
  //   }
  // })

  const {
    number_plate,
    model,
    make,
    engine_no,
    chassis_no,
    transmission_type,
    fuel_type,
    seating_capacity,
    mileage,
    owner_id
  } = req.body;

  // Extract files from req.files
  const { photo_1, photo_2, photo_3, document } = req.files;

  try {
    // Initialize variables for file buffers
    let photo_1_buffer = null;
    let photo_2_buffer = null;
    let photo_3_buffer = null;
    let document_buffer = null;

    // Check if files exist and assign their buffers
    if (photo_1) photo_1_buffer = photo_1[0].buffer;
    if (photo_2) photo_2_buffer = photo_2[0].buffer;
    if (photo_3) photo_3_buffer = photo_3[0].buffer;
    if (document) document_buffer = document[0].buffer;

    // Insert vehicle data into vehicles table
    const vehicleInsertQuery = `
      INSERT INTO "carConnectPro"."vehicles" (
        number_plate, model, make, engine_no, chassis_no, transmission_type, fuel_type, seating_capacity, mileage,
        photo_1, photo_2, photo_3, document
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const vehicleInsertValues = [
      number_plate, model, make, engine_no, chassis_no, transmission_type, fuel_type, seating_capacity, mileage,
      photo_1_buffer, photo_2_buffer, photo_3_buffer, document_buffer
    ];

    const vehicleResult = await pool.query(vehicleInsertQuery, vehicleInsertValues);
    const vehicleId = vehicleResult.rows[0].vehicle_id;

    // Insert owner-vehicle relation data into owner_vehicle table
    const ownerVehicleInsertQuery = `
      INSERT INTO "carConnectPro"."owner_vehicle" (owner_id, vehicle_id, reg_year)
      VALUES ($1, $2, $3);
    `;
    const ownerVehicleInsertValues = [owner_id, vehicleId, req.body.reg_year];
    await pool.query(ownerVehicleInsertQuery, ownerVehicleInsertValues);

    return res.status(201).json({
      status: 'success',
      message: 'Vehicle added successfully',
      data: {
        vehicle: vehicleResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to add vehicle',
      error: error.message
    });
  }
});


// @ DESCRIPTION      => Get all owner Vehicles
// @ ENDPOINT         => /vehicles
// @ ACCESS           => Vehicle Owner
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/26

exports.getVehicles = catchAsync(async (req, res, next) => {
  const owner_id = req.body.id;

  const result = await pool.query(`
    SELECT vt.vehicle_id, vt.number_plate, vt.model, vt.make, ot.reg_year, vt.photo_1 FROM "carConnectPro"."owner_vehicle" as OT
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
    if (schema.rows.length > 0) {
      recordObj = recordObj.filter(record => record.schema === schema.rows[0].schema);
    }
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