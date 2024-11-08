const pool = require('../db/db');
const catchAsync = require('../utils/catchAsync');

exports.getGender = catchAsync(async (req, res, next) => { 
  const result = await pool.query(`
      SELECT * FROM "carConnectPro"."gender"
    `);
  return res.status(200).json({
    status: "success",
    showQuickNotification: false,
    message: "Retrieved all gender parameters...",
    data: {
      genders: result.rows
    }
  });
});

exports.getFuelType = catchAsync(async (req, res, next) => { 
  const result = await pool.query(`
      SELECT * FROM "carConnectPro"."fuel_type"
    `);
  return res.status(200).json({
    status: "success",
    showQuickNotification: false,
    message: "Retrieved all fuel tpe parameters...",
    data: {
      fuelType: result.rows
    }
  });
});

exports.getTransmissionType = catchAsync(async (req, res, next) => { 
  const result = await pool.query(`
      SELECT * FROM "carConnectPro"."transmission_type"
    `);
  
  return res.status(200).json({
    status: "success",
    showQuickNotification: false,
    message: "Retrieved all transmission tpe parameters...",
    data: {
      transmissionType: result.rows
    }
  });
});

exports.getCenters = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
    SELECT center_id, name, street_1, street_2, city, province, phone, email, center_type FROM "carConnectPro"."center"
  `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: false,
    message: "Retrieved all centers",
    data: {
      centers: result.rows
    }
  })
});