const pool = require('../db/db');
const catchAsync = require('../utils/catchAsync');

// @ DESCRIPTION      => Get all Vehicles
// @ ENDPOINT         => /vehicles
// @ ACCESS           => Centers super admin and employees with privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/28

exports.getVehicles = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
    SELECT vt.vehicle_id, vt.number_plate, vt.model, vt.make, ot.reg_year, oot.id, oot.name, oot.phone, ft.description AS fuel_type
    FROM "carConnectPro"."owner_vehicle" AS ot
    RIGHT JOIN "carConnectPro"."vehicles" AS vt ON ot.vehicle_id = vt.vehicle_id
    RIGHT JOIN "carConnectPro"."owner" AS oot ON ot.owner_id = oot.id
    LEFT JOIN "carConnectPro"."fuel_type" AS ft ON vt.fuel_type = ft.type;
  `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved vehicles successfully...",
    data: {
      vehicles: result.rows,
    }
  })
});