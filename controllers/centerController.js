const pool = require("../db/db");
const catchAsync = require("../utils/catchAsync");
const { error } = require("console");
const logController = require("../controllers/logController");
const crypto = require("crypto");
const AppError = require("../utils/appError");

// functions

// @ DESCRIPTION      => Generate Random Salt
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

// @ DESCRIPTION      => Hash Password
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 512, "sha512");
}

// @ DESCRIPTION      => Check if username already exists
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function isUsernameAlreadyTaken(username) {
  // Query the schema_mapping table
  const schemaQueryResult = await pool.query(
    `
    SELECT * FROM "carConnectPro".schema_mapping WHERE username = $1
  `,
    [username]
  );
  return schemaQueryResult.rows.length > 0; // Return true if username exists, false otherwise
}

// @ DESCRIPTION      => Insert username into SchemaMapping table
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function insertToSchemaMapping(username, schemaName) {
  await pool.query(
    `
      INSERT INTO "carConnectPro"."schema_mapping" (username, schema) VALUES ($1, $2)
    `,
    [username, schemaName]
  );
}

// @ DESCRIPTION      => Get Center Profile by center id
// @ ENDPOINT         => /center/profile/:centerId
// @ ACCESS           => super admin of center
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getProfile = catchAsync(async (req, res, next) => {
  const centerId = req.params.id;
  const result = await pool.query(
    `
    SELECT center_id, center_type, username, name, email, phone, street_1, street_2, city, province, roles
    FROM "carConnectPro"."center" 
    WHERE center_id = $1 AND center_type in ($2, $3,$4)
  `,
    [centerId, "S", "R", "B"]
  );

  // console.log('Request received for center ID:', centerId);
  // console.log('Query result:', result);

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid center id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved Center Profile Data...",
    data: {
      userData: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Update center information
// @ ENDPOINT         => /center/profile/:centerId
// @ ACCESS           => super admin of center
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.params.userId; // @Harindu
  const { name, phone, center_type, street_1, street_2, city, province } =
    req.body;

  console.log("Received request to update profile:", req.body);

  let sql = `
  UPDATE "carConnectPro"."center"
  SET name = $1, phone = $2, center_type = $3, street_1 = $4, street_2 = $5, city = $6, province = $7
  WHERE center_id = $8 
  RETURNING center_id, username, name, email, phone, center_type, street_1, street_2, city, province;
  `;

  const values = [
    name,
    phone,
    center_type,
    street_1,
    street_2,
    city,
    province,
    userId,
  ];

  // console.log('SQL query:', sql);
  // console.log('SQL values:', values);

  try {
    const result = await pool.query(sql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found or no changes made to the profile.",
      });
    }

    // Logging the profile change
    const logObj = {
      id: req.params.userId,
      username: result.rows[0].username,
      type: "Center",
      action: "Update",
      updatedFields: req.body,
    };

    await logController.logProfileChange(logObj, res, next);

    return res.status(200).json({
      status: "success",
      showQuickNotification: true,
      message: "Profile updated successfully.",
      data: {
        userData: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      status: "error",
      showQuickNotification: true,
      message: "An error occurred while updating profile.",
      error: error.message,
    });
  }
});

// @ DESCRIPTION      => Get all employees of center
// @ ENDPOINT         => /center/employee
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getEmployees = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
    SELECT et.id, et.name, et.username, et.profile_pic, et.email, et.contact, et.dob, et.nic, et.gender, mt.id AS manager_id, mt.name AS manager_name, mt.designation AS manager_designation, et.designation, et.salary, et.roles, et."isActive"
      FROM ${req.body.schema}."employee" AS et LEFT JOIN ${req.body.schema}."employee" AS mt ON et.manager_id = mt.id
      ORDER BY et.id
  `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved Employees successfully..",
    data: {
      empData: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get an employee of center
// @ ENDPOINT         => /center/employee/:empId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getEmployee = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    SELECT et.id, et.name, et.username, et.profile_pic, et.email, et.contact, et.dob, et.nic, et.gender, mt.id AS manager_id, mt.name AS manager_name, mt.designation AS manager_designation, et.designation, et.salary, et.roles, et."isActive"
    FROM ${req.body.schema}."employee" AS et LEFT JOIN ${req.body.schema}."employee" AS mt ON et.manager_id = mt.id WHERE et.id = $1
  `,
    [req.params.empId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid employee id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved Employees successfully..",
    data: {
      empData: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add an employee of center
// @ ENDPOINT         => /center/employee
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.addEmployee = catchAsync(async (req, res, next) => {
  const {
    username,
    password,
    name,
    gender,
    dob,
    contact,
    email,
    nic,
    manager_id,
    salary,
    isActive,
    profile_pic,
    designation,
  } = req.body;
  const salt = generateSalt();
  const pwdhash = hashPassword(password, salt);

  // Checking username uniqueness for schema_mapping table
  const isUsernameTaken = await isUsernameAlreadyTaken(username);
  if (isUsernameTaken) {
    return res.status(409).json({
      status: "fail",
      showQuickNotification: true,
      message: "User already exists... User a different username...",
      error: error,
    });
  }

  let empData = {
    name,
    username,
    salt,
    pwdhash,
    profile_pic,
    email,
    contact,
    dob,
    nic,
    gender,
    manager_id,
    designation,
    salary,
    isActive,
    schema: req.body.schema,
  };

  const result = await pool.query(
    `
      INSERT INTO ${req.body.schema}."employee" (name, username, salt, password, profile_pic, email, contact, dob, nic, gender, manager_id, designation, salary, roles, "isActive")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `,
    [
      empData.name,
      empData.username,
      empData.salt,
      empData.pwdhash,
      empData.profile_pic,
      empData.email,
      empData.contact,
      empData.dob,
      empData.nic,
      empData.gender,
      empData.manager_id,
      empData.designation,
      empData.salary,
      1,
      empData.isActive,
    ]
  );

  const result1 = await pool.query(
    `
  SELECT et.id, et.name, et.username, et.profile_pic, et.email, et.contact, et.dob, et.nic, et.gender, mt.id AS manager_id, mt.name AS manager_name, mt.designation AS manager_designation, et.designation, et.salary, et.roles, et."isActive"
  FROM ${req.body.schema}."employee" AS et LEFT JOIN ${req.body.schema}."employee" AS mt ON et.manager_id = mt.id WHERE et.id = $1
  `,
    [result.rows[0].id]
  );

  // logging
  await logController.logLoginRegister(
    {
      id: result1.rows[0].id,
      type: "Employee of " + req.body.schema.toString(),
      username: result1.rows[0].username,
      action: "Register",
    },
    res,
    next
  );
  await insertToSchemaMapping(username, req.body.schema);

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Added Employee Successfully...",
    data: {
      empData: result1.rows[0],
    },
  });
});

// @ DESCRIPTION      => Update an employee of center
// @ ENDPOINT         => /center/employee/:empId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updateEmployee = catchAsync(async (req, res, next) => {
  let sql = `
      UPDATE ${req.body.schema}."employee" SET
    `;
  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== "id" && key !== "schema") {
      if (key === "isActive") {
        sql = sql.concat(' "isActive" = $', count.toString(), ", ");
        count++;
        dataArr.push(req.body[key]);
      } else {
        sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key]);
      }
    }
  }
  sql = sql.substring(0, sql.length - 2);
  sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING id");
  dataArr.push(req.params.empId);

  const result = await pool.query(sql, dataArr);

  const result1 = await pool.query(
    `
  SELECT et.id, et.name, et.username, et.profile_pic, et.email, et.contact, et.dob, et.nic, et.gender, mt.id AS manager_id, mt.name AS manager_name, mt.designation AS manager_designation, et.designation, et.salary, et.roles, et."isActive"
  FROM ${req.body.schema}."employee" AS et LEFT JOIN ${req.body.schema}."employee" AS mt ON et.manager_id = mt.id WHERE et.id = $1
  `,
    [result.rows[0].id]
  );

  await logController.logProfileChange(
    {
      id: result1.rows[0].id,
      username: result1.rows[0].username,
      type: "Employee of " + req.body.schema,
      action: "Update",
      updatedFields: req.body,
    },
    res,
    next
  );
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Updated employee profile successfully...",
    data: {
      empData: result1.rows[0],
    },
  });
});

// @ DESCRIPTION      => Delete an employee of center
// @ ENDPOINT         => /center/employee/:empId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.deleteEmployee = catchAsync(async (req, res, next) => {
  await pool.query(
    `
      DELETE FROM "{req.body.schema}."employee" WHERE id = $1
    `,
    [req.params.empId]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully deleted employee...",
  });
});

// @ DESCRIPTION      => Get all roles of center
// @ ENDPOINT         => /center/settings/roles
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getAllRoles = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
      SELECT id, name, description, privileges 
      FROM ${req.body.schema}."roles"
      ORDER BY id
    `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved all roles",
    data: {
      roles: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get a role of center
// @ ENDPOINT         => /center/settings/roles/:roleID
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getRole = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT * FROM ${req.body.schema}."roles" WHERE id = $1
    `,
    [req.params.roleId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid employee id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved a role",
    data: {
      roles: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add a role of center
// @ ENDPOINT         => /center/settings/roles
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.addRole = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
        INSERT INTO ${req.body.schema}.roles (name, description, privileges) 
        VALUES ($1, $2, $3) RETURNING *
      `,
    [req.body.name, req.body.description, req.body.privileges]
  );

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Added role successfully",
    data: {
      role: result.rows,
    },
  });
});

// @ DESCRIPTION      => Update a role of center
// @ ENDPOINT         => /center/settings/roles/:roleId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updateRole = catchAsync(async (req, res, next) => {
  let sql = `UPDATE ${req.body.schema}."roles" SET `;
  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== "id" && key !== "schema") {
      sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
      count++;
      dataArr.push(req.body[key]);
    }
  }
  console.log("sql: ", sql);
  sql = sql.substring(0, sql.length - 2);
  sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
  dataArr.push(req.params.roleId);
  console.log(sql);
  const result = await pool.query(sql, dataArr);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Edited role successfully...",
    data: {
      role: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Delete a role of center
// @ ENDPOINT         => /center/settings/roles/:roleId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.deleteRole = catchAsync(async (req, res, next) => {
  await pool.query(
    `
      DELETE FROM ${req.body.schema}."roles" WHERE id = $1
    `,
    [req.params.roleId]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully deleted role...",
  });
});

// @ DESCRIPTION      => Get inventory of a center
// @ ENDPOINT         => /center/inventory
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getInventory = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
      SELECT * FROM "${req.body.schema}"."part"
    `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved all inventory data...",
    data: {
      inventory: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get a part of a center
// @ ENDPOINT         => /center/inventory/:partId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getPart = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT * FROM "${req.body.schema}"."part" WHERE part_id = $1
    `,
    [req.params.partId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid part id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved all inventory data...",
    data: {
      part: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add a part of a center
// @ ENDPOINT         => /center/inventory
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.addPart = catchAsync(async (req, res, next) => {
  const { name, description, manufacture_country, quantity, price } = req.body;
  const result = await pool.query(
    `
      INSERT INTO "${req.body.schema}"."part" (name, description, manufacture_country, quantity, price)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `,
    [name, description, manufacture_country, quantity, price]
  );

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Added part successfully",
    data: {
      part: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Update a part of a center
// @ ENDPOINT         => /center/inventory/:partId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updatePart = catchAsync(async (req, res, next) => {
  const { name, description, manufacture_country, quantity, price } = req.body;

  let sql = `UPDATE "${req.body.schema}"."part" SET `;
  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== "id" && key !== "schema") {
      sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
      count++;
      dataArr.push(req.body[key]);
    }
  }
  sql = sql.substring(0, sql.length - 2);
  sql = sql.concat(" WHERE part_id = $", count.toString(), " RETURNING *");
  dataArr.push(req.params.partId);

  const result = await pool.query(sql, dataArr);
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Updated part successfully",
    data: {
      part: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Delete a part of a center
// @ ENDPOINT         => /center/inventory/:partId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.deletePart = catchAsync(async (req, res, next) => {
  await pool.query(
    `
      DELETE FROM "${req.body.schema}"."part" WHERE part_id = $1
    `,
    [req.params.partId]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Part deleted successfully...",
  });
});

// @ DESCRIPTION      => Get services of a center
// @ ENDPOINT         => /settings/serviceTypes
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/09

exports.getServiceTypes = catchAsync(async (req, res, next) => {
  console.log(req.body.schema);
  const result = await pool.query(`
    SELECT * FROM ${req.body.schema}."services";
  `);
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved service types...",
    data: {
      serviceTypes: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get a service of a center
// @ ENDPOINT         => /settings/serviceTypes/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/09

exports.getServiceTypeByID = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    SELECT * FROM ${req.body.schema}."services" WHERE id = $1
  `,
    [req.params.serviceId]
  );

  console.log(result);

  if (result.rowCount === 0) {
    return res.status(404).json({
      status: "failed",
      showQuickNotification: true,
      message: "Required ID does not exist...",
    });
  }
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved service type...",
    data: {
      service: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add services of a center
// @ ENDPOINT         => /settings/serviceTypes
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/09

exports.addServiceType = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    INSERT INTO ${req.body.schema}."services" (name, description, cost) 
    VALUES ($1, $2, $3) 
  `,
    [req.body.name, req.body.description, req.body.cost]
  );

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully added service...",
    data: {
      service: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => edit services of a center
// @ ENDPOINT         => /settings/serviceTypes/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/09

exports.editServiceType = catchAsync(async (req, res, next) => {
  let sql = `UPDATE ${req.body.schema}."services" SET `;
  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== "id" && key !== "schema") {
      sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
      count++;
      dataArr.push(req.body[key]);
    }
  }
  sql = sql.substring(0, sql.length - 2);
  sql = sql.concat(" WHERE id = $", count.toString());
  dataArr.push(req.params.serviceId);

  const result = await pool.query(sql, dataArr);
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Updated service successfully...",
    data: {
      service: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => delete service type of a center
// @ ENDPOINT         => /settings/serviceTypes/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/04/10

exports.deleteServiceType = catchAsync(async (req, res, next) => {
  await pool.query(
    `
    DELETE FROM ${req.body.schema}."services" WHERE id = $1
  `,
    [req.params.serviceId]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Service deleted successfully...",
  });
});

// @ DESCRIPTION      => Get clients of a center
// @ ENDPOINT         => /center/clients
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getClients = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
      SELECT ct.id, ct.vehicle_id, vt.number_plate, vt.model, vt.make, vt.engine_no, vt.chassis_no, tt.description AS transmission_type, ft.description AS fuel_type, vt.seating_capacity, ct.date_of_reg AS client_reg_date, ct.mileage_on_reg, ct.owner AS owner_id, ot.name AS owner_name, ot.phone AS owner_contact, ot.email as owner_email 
      FROM "${req.body.schema}"."clients" AS ct
      INNER JOIN "carConnectPro"."vehicles" AS vt
      ON ct.vehicle_id = vt.vehicle_id
      INNER JOIN "carConnectPro"."fuel_type" AS ft
      ON vt.fuel_type = ft.type
      INNER JOIN "carConnectPro"."transmission_type" AS tt
      ON vt.transmission_type = tt.type
      INNER JOIN "carConnectPro"."owner" AS ot
      ON ct.owner = ot.id;
    `);

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved clients...",
    data: {
      clients: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get a client of a center
// @ ENDPOINT         => /center/client/:clientId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getClient = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    SELECT ct.id, ct.vehicle_id, vt.number_plate, vt.model, vt.make, vt.engine_no, vt.chassis_no, tt.description AS transmission_type, ft.description AS fuel_type, vt.seating_capacity, ct.date_of_reg AS client_reg_date, ct.mileage_on_reg, ct.owner AS owner_id, ot.name AS owner_name, ot.phone AS owner_contact, ot.email as owner_email 
    FROM "${req.body.schema}"."clients" AS ct
    INNER JOIN "carConnectPro"."vehicles" AS vt
    ON ct.vehicle_id = vt.vehicle_id
    INNER JOIN "carConnectPro"."fuel_type" AS ft
    ON vt.fuel_type = ft.type
    INNER JOIN "carConnectPro"."transmission_type" AS tt
    ON vt.transmission_type = tt.type
    INNER JOIN "carConnectPro"."owner" AS ot
    ON ct.owner = ot.id
    WHERE ct.id = $1;
  `,
    [req.params.clientId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid part id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved client...",
    data: {
      client: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add a client of a center
// @ ENDPOINT         => /center/client
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.addClient = catchAsync(async (req, res, next) => {
  const { vehicle_id, date_of_reg, mileage_on_reg, owner_id } = req.body;

  const result = await pool.query(
    `
    INSERT INTO "${req.body.schema}"."clients" (
      vehicle_id, date_of_reg, mileage_on_reg, owner
    ) VALUES ($1, $2, $3, $4) RETURNING *
  `,
    [vehicle_id, date_of_reg, mileage_on_reg, owner_id]
  );

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Inserted client successfully...",
    data: {
      client: result.rows,
    },
  });
});

// @ DESCRIPTION      => update a client of a center
// @ ENDPOINT         => /center/client/:clientId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updateClient = catchAsync(async (req, res, next) => {
  let sql = `UPDATE "${req.body.schema}"."clients" SET `;

  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    if (key !== "id" && key !== "schema") {
      sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
      count++;
      dataArr.push(req.body[key]);
    }
  }
  sql = sql.substring(0, sql.length - 2);
  sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
  dataArr.push(req.params.partId);

  const result = await pool.query(sql, dataArr);
  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Updated client successfully",
    data: {
      part: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Get ongoing services of a center
// @ ENDPOINT         => /center/onGoingServices
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getOnGoingServices = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    SELECT 
      sr.id AS service_record_id,
      sr.client_id,
      sr.service_date,
      sr.description,
      sr.mileage,
      sr.cost,
      sr.details,
      array_agg(st.technician_id) AS technicians
    FROM 
      "${req.body.schema}"."service_records" AS sr
    LEFT JOIN 
      "${req.body.schema}"."service_technician" AS st ON sr.id = st.service_id
    WHERE 
      sr."isOngoing" = $1
    GROUP BY
      sr.id, sr.client_id, sr.service_date, sr.description, sr.mileage, sr.cost
  `,
    [true]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved Ongoing services successfully...",
    data: {
      ogs: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get Finished services of a center
// @ ENDPOINT         => /center/finishedServices
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getFinishedServices = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
    SELECT 
      sr.id AS service_record_id,
      sr.client_id,
      sr.service_date,
      sr.description,
      sr.mileage,
      sr.cost,
      sr.details,
      array_agg(st.technician_id) AS technicians
    FROM 
      "${req.body.schema}"."service_records" AS sr
    LEFT JOIN 
      "${req.body.schema}"."service_technician" AS st ON sr.id = st.service_id
    WHERE 
      sr."isOngoing" = $1
    GROUP BY
      sr.id, sr.client_id, sr.service_date, sr.description, sr.mileage, sr.cost
  `,
    [false]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Retrieved Ongoing services successfully...",
    data: {
      fs: result.rows,
    },
  });
});

// @ DESCRIPTION      => Get an ongoing service of a center
// @ ENDPOINT         => /center/onGoingServices/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getOnGoingService = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT
        sr.id,
        sr.client_id,
        sr.service_date,
        sr.description,
        sr.mileage,
        sr.cost,
        sr.details,
        array_agg(st.technician_id) AS technicians
      FROM
        "${req.body.schema}"."service_records" AS sr
      JOIN 
        "${req.body.schema}"."service_technician" AS st ON sr.id = st.service_id
      WHERE 
        sr."isOngoing" = $1 AND sr.client_id = $2
      GROUP BY
        sr.id, sr.client_id, sr.service_date, sr.description, sr.mileage, sr.cost
    `,
    [true, req.params.onGoingServiceId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid service id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved service...",
    data: {
      client: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Add an ongoing service of a center
// @ ENDPOINT         => /center/onGoingServices
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.addOnGoingService = catchAsync(async (req, res, next) => {
  const {
    client_id,
    service_date,
    description,
    mileage,
    cost,
    details,
    isOngoing,
    technician_ids,
  } = req.body;

  const result = await pool.query(
    `
    WITH inserted_record AS (
      INSERT INTO "${req.body.schema}"."service_records" (client_id, service_date, description, mileage, cost, details, "isOngoing")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    )
    INSERT INTO "${req.body.schema}"."service_technician" (service_id, technician_id)
    SELECT inserted_record.id, technician_id
    FROM inserted_record, unnest($8::int[]) AS technician_id
`,
    [
      client_id,
      service_date,
      description,
      mileage,
      cost,
      details,
      isOngoing,
      technician_ids,
    ]
  );

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully added ongoing service...",
    data: {
      osg: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Update an ongoing service of a center
// @ ENDPOINT         => /center/onGoingServices/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.updateOnGoingService = catchAsync(async (req, res, next) => {
  const {
    client_id,
    service_date,
    description,
    mileage,
    cost,
    details,
    isOngoing,
    technician_ids,
  } = req.body;

  let sql = `UPDATE "${req.body.schema}"."service_records" SET `;
  const dataArr = [];
  let count = 1;
  for (let key in req.body) {
    console.log("key ", key);
    if (key !== "id" && key !== "schema" && key !== "technician_ids") {
      if (key === "isOngoing") {
        sql = sql.concat('"', key.toString(), '" = $', count.toString(), ", ");
      } else {
        sql = sql.concat(key.toString(), " = $", count.toString(), ", ");
      }
      count++;
      dataArr.push(req.body[key]);
    }
  }
  sql = sql.slice(0, -2);
  sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
  dataArr.push(req.params.onGoingServiceId);
  const result = await pool.query(sql, dataArr);
  let updatedRes = {
    serviceRecord: result.rows,
  };
  if ("technician_ids" in req.body) {
    const techs = await pool.query(
      `
      SELECT technician_id FROM "${req.body.schema}"."service_technician" WHERE service_id = $1
    `,
      [req.body.id]
    );

    let techSQL = `INSERT INTO "${req.body.schema}"."service_technician" (service_id, technician_id) VALUES`;
    let c = 2;
    let valArr = [];
    valArr.push(req.params.onGoingServiceId);
    for (let i = 1; i < req.body.technician_ids.length; i++) {
      const found = technician_ids.includes(req.body.technician_ids[i]);
      if (!found) {
        techSQL = techSQL.concat("($1, $" + c.toString() + "),");
        valArr.push(req.body.technician_ids[i]);
        c++;
      }
    }
    techSQL = techSQL.slice(0, -1);
    techSQL = techSQL.concat("RETURNING *");
    console.log(techSQL, valArr);
    if (c !== 2) {
      const updatedTechs = await pool.query(techSQL, valArr);
      updatedRes.techs = updatedTechs.rows;
    }
  }

  return res.status(201).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully updagted ongoing service...",
    data: {
      osg: updatedRes,
    },
  });
});

// @ DESCRIPTION      => Get full service history of a center
// @ ENDPOINT         => /center/service
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getServices = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT * FROM "${req.body.schema}"."service_record" WHERE "isOngoing" = $1
    `,
    [false]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved services...",
    data: {
      osg: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Get a service history of a center
// @ ENDPOINT         => /center/service/:serviceId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getService = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT * FROM "${req.body.schema}"."service_record" WHERE isOngoing = $1 AND id = $2
    `,
    [false, req.body.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      showQuickNotification: true,
      message: "Invalid service id",
      error: error,
    });
  }

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved service...",
    data: {
      client: result.rows[0],
    },
  });
});

// @ DESCRIPTION      => Get service history of a vehicle
// @ ENDPOINT         => /center/service/:vehicleId
// @ ACCESS           => super admin of center || any employee who has privileges
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/24

exports.getVehicleServiceHistory = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    `
      SELECT * FROM "${req.body.schema}"."service_record" WHERE isOngoing = $1 AND vehicle_id = $2
    `,
    [false, req.params.vehicleId]
  );

  return res.status(200).json({
    status: "success",
    showQuickNotification: true,
    message: "Successfully retrieved service history of vehicle...",
    data: {
      client: result.rows,
    },
  });
});
