const pool = require('../db/db');
const crypto = require('crypto');
const logController = require('../controllers/logController');
const catchAsync = require('../utils/catchAsync');
const { error } = require('console');
const AppError = require('../utils/appError');

// functions

// @ DESCRIPTION      => Generate Random Salt 
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// @ DESCRIPTION      => Hash Password
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
}

// @ DESCRIPTION      => Check if username already exists
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function isUsernameAlreadyTaken(username) {
  // Query the schema_mapping table
  const schemaQueryResult = await pool.query(`
    SELECT * FROM "carConnectPro".schema_mapping WHERE username = $1
  `, [username]);
  return schemaQueryResult.rows.length > 0; // Return true if username exists, false otherwise
};

// @ DESCRIPTION      => Insert username into SchemaMapping table
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function insertToSchemaMapping(username, schemaName) {
  await pool.query(`
      INSERT INTO "carConnectPro"."schema_mapping" (username, schema) VALUES ($1, $2)
    `, [username, schemaName]);
}

// @ DESCRIPTION      => Register Vehicle Owner
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function registerVehicleOwner(ownerData, res, next) {

  const result = await pool.query(`
    INSERT INTO "carConnectPro".owner (username, salt, password, name, gender, dob, street_1, street_2, city, province, phone, email, roles, nic)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING username, name, gender, dob, street_1, street_2, city, province, phone, email, roles, nic
    `,
    [
      ownerData.username,
      ownerData.salt,
      ownerData.pwdhash,
      ownerData.name,
      ownerData.gender,
      ownerData.dob,
      ownerData.street_1,
      ownerData.street_2,
      ownerData.city,
      ownerData.province,
      ownerData.phone,
      ownerData.email,
      'mv:ad, pp:ad',
      ownerData.nic
    ]
  );
  // logging
  await logController.logLoginRegister({ id: result.rows[0].id, type: "Vehicle Owner", username: result.rows[0].username, action: "Register" }, res, next);
  return result;

}

// @ DESCRIPTION      => Register Service or Repair Center
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function registerServiceOrRepairCenter(centerData, res, data) {
  // Creating schema and tables for the center
  await createSchemaAndTables(centerData.schemaName);

  const result = await pool.query(`
    INSERT INTO "carConnectPro".center (center_type, username, salt, password, name, street_1, street_2, city, province, phone, email, roles)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING center_type, username, name, street_1, street_2, city, province, phone, email, roles
  `,
    [
      centerData.centerType,
      centerData.username,
      centerData.salt,
      centerData.pwdhash,
      centerData.name,
      centerData.street_1,
      centerData.street_2,
      centerData.city,
      centerData.province,
      centerData.phone,
      centerData.email,
      's:ad'
    ]
  );

  // logging  
  let type = '';
  switch (centerData.centerType) {
    case 'S':
      type = 'Service';
      break;
    case 'R':
      type = 'Repair';
      break;
    case 'B':
      type = 'Service and Repair';
      break;
    default:
      return next(
        new AppError('Invalid center type', 400)
      )
  }
  await logController.logLoginRegister({id: result.rows[0].id, type: "Center " + centerData.schemaName, username: result.rows[0].username, action: "register"}, res, next);

  return result;
}

// @ DESCRIPTION      => Create dynamic schema name and tables
// @ ENDPOINT         => --------------------
// @ ACCESS           => --------------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

async function createSchemaAndTables(schemaName) {
  const client = await pool.connect();
  try {

    // Create schema
    await client.query(`CREATE SCHEMA ${schemaName}`);

    // creating inventory tables
    await client.query(`CREATE TABLE ${schemaName}.part (
      part_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      manufacture_country TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL
    )`);

    await client.query(`CREATE TABLE ${schemaName}.roles(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      privileges TEXT NOT NULL
    )`);

    await client.query(`INSERT INTO ${schemaName}.roles(name, description, privileges) 
      VALUES('Basic Role', 'Provides access to profile page for employee', 'pp:ad')
    `);

    // employee table
    await client.query(`CREATE TABLE ${schemaName}.employee (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      salt BYTEA NOT NULL,
      password BYTEA NOT NULL,
      profile_pic BYTEA NOT NULL,
      email TEXT NOT NULL,
      contact TEXT NOT NULL,
      nic TEXT NOT NULL,
      gender CHAR,
      dob DATE NOT NULL,
      manager_id INTEGER REFERENCES ${schemaName}.employee(id),
      designation TEXT NOT NULL,
      salary NUMERIC(10,2) NOT NULL,
      roles INTEGER REFERENCES ${schemaName}.roles(id),
      isActive BOOLEAN NOT NULL
    )`);

    // client table
    await client.query(`CREATE TABLE ${schemaName}.clients (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES "carConnectPro".vehicles(vehicle_id),
      date_of_reg DATE NOT NULL,
      mileage_on_reg NUMERIC(8,1) NOT NULL,
      owner INTEGER NOT NULL REFERENCES "carConnectPro".owner(id)
    )`);

    // service table
    await client.query(`CREATE TABLE ${schemaName}.service_records(
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES ${schemaName}.clients(id),
      service_date DATE NOT NULL,
      description TEXT NOT NULL,
      mileage NUMERIC(8,1) NOT NULL,
      cost NUMERIC(12,2) NOT NULL,
      details JSON,
      isOngoing BOOLEAN NOT NULL DEFAULT TRUE
    )`);

    // service technician table
    await client.query(`CREATE TABLE ${schemaName}.service_technicians(
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES ${schemaName}.service_records(id),
      technician_id INTEGER NOT NULL REFERENCES ${schemaName}.employee(id)
    )`);

    // services types table
    await client.query(`CREATE TABLE ${schemaName}.services(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      cost NUMERIC(12,2) NOT NULL
    )`)

  } catch (error) {
    console.error('Error creating schema and tables:', error.message);
    return next(
      new AppError('Failed to create schema and tables.', 500)
    )
  } finally {
    client.release();
  }
}

// controllers

// @ DESCRIPTION      => Create User
// @ ENDPOINT         => /register
// @ ACCESS           => All owners, center super admin
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

exports.register = catchAsync(async (req, res, next) => {
  const isOwner = req.body.isOwner;

  // Checking username uniqueness for schema_mapping table
  const isUsernameTaken = await isUsernameAlreadyTaken(req.body.username);
  if (isUsernameTaken) {
    return res.status(409).json({
      status: "fail",
      showQuickNotification: true,
      message: "User already exists... User a different username...",
      error: error
    });
  }

  if (isOwner) {
    const { username, password, name, gender, dob, street_1, street_2, city, province, phone, email, nic } = req.body;
    const salt = generateSalt();
    const pwdhash = hashPassword(password, salt);

    let ownerData = {
      username,
      salt,
      pwdhash,
      name,
      gender,
      dob,
      street_1,
      street_2,
      city,
      dob,
      province,
      phone,
      email,
      nic
    };
    const result = await registerVehicleOwner(ownerData, res, next);
    // adding username and schema to schema_mapping
    await insertToSchemaMapping(username, "carConnectPro");

    return res.status(201).json({
      status: "success",
      showQuickNotification: true,
      message: "User Registration Successful...",
      data: {
        user: result.rows[0],
      }
    });
  } else {
    const { username, password, name, street_1, street_2, city, province, phone, email, center_type } = req.body;
    const salt = generateSalt();
    const pwdhash = hashPassword(password, salt);

  
    let schemaName = ''
    switch (center_type) {
      case 'S':
        
        schemaName = `service_${name.toLowerCase().replace(/\s+/g, '_')}`;
        break
      case 'R':
        
        schemaName = `repair_${name.toLowerCase().replace(/\s+/g, '_')}`;
        break;
      case 'B':
        
        schemaName = `service_repair_${name.toLowerCase().replace(/\s+/g, '_')}`;
        break;
      default:
        throw new Error('Invalid center type', 401);
    }

    let centerData = {
      center_type,
      username,
      salt,
      pwdhash,
      name,
      street_1,
      street_2,
      city,
      province,
      phone,
      email,
      schemaName,
    }
    const result = await registerServiceOrRepairCenter(centerData, res, next);

    // adding username and schema to schema_mapping
    await insertToSchemaMapping(username, schemaName);
    res.status(201).json({
      status: "success",
      showQuickNotification: true,
      message: "User Registration Successful...",
      data: {
        user: result.rows[0],
      }
    });
  }
});