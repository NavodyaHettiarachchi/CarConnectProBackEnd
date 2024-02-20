const express = require('express');
const pool = require('../db/db');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const loginRegisterLogs = require('../models/loginRegisterLogs.model');

const router = express.Router();

router.post('/',
  [
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
    check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters'),
    check('name').trim().isString().withMessage('Name can only be a string'),
    check('street_1').trim().notEmpty().withMessage('Invalid Address'),
    check('street_2').trim().notEmpty().withMessage('Invalid Address'),
    check('city').trim().isString().withMessage('Invalid City Name'),
    check('province').trim().isString().withMessage('Invalid Province'),
    check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
    check('email').trim().isEmail().withMessage('Invalid Email'),
    // conditional validation
    check('gender').optional().isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
    check('dob').optional().isISO8601().toDate().withMessage('Invalid date of birth'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const isOwner = req.body.isOwner;

    if (isOwner) {
      try {
        const { username, password, name, gender, dob, street_1, street_2, city, province, phone, email, nic } = req.body;
        const salt = generateSalt();
        const pwdhash = hashPassword(password, salt);

        // Checking username uniqueness for schema_mapping table
        const isUsernameTaken = await isUsernameAlreadyTaken(username);
        if (isUsernameTaken) { 
          return res.status(400).json({ error: 'Username is already taken' });
        }

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
        }
        const result = await registerVehicleOwner(ownerData);
        // adding username and schema to schema_mapping
        await insertToSchemaMapping(username, "carConnectPro");
        res.status(200).json(result.rows[0]);

      } catch (err) {
        console.error("Failed to register user: ", err.message);
        res.status(500).json({ error: 'Failed to register user. Please try again later.' });
      }
    } else {
      try {
        const { username, password, name, street_1, street_2, city, province, phone, email, type } = req.body;
        const salt = generateSalt();
        const pwdhash = hashPassword(password, salt);

        // Checking username uniqueness for schema_mapping table
        const isUsernameTaken = await isUsernameAlreadyTaken(username);
        if (isUsernameTaken) {
          return res.status(400).json({ error: 'Username is already taken' });
        }

        let centerType = '';
        let schemaName = ''
        switch (type) {
          case 'S':
            centerType = "S";
            schemaName = `service_${name.toLowerCase().replace(/\s+/g, '_')}`;
            break
          case 'R':
            centerType = "R";
            schemaName = `repair_${name.toLowerCase().replace(/\s+/g, '_')}`;
            break;
          case 'B':
            centerType = "B";
            schemaName = `service_repair_${name.toLowerCase().replace(/\s+/g, '_')}`;
            break;
          default:
            throw new Error('Invalid center type');
            break;
        }

        let centerData = {
          centerType,
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
        const result = await registerServiceOrRepairCenter(centerData);

        // adding username and schema to schema_mapping
        await insertToSchemaMapping(username, schemaName);
        res.status(200).json(result.rows[0]);
      } catch (err) {
        console.error('Error during center registration:', err.message);
        res.status(500).json({ error: 'Failed to register center. Please try again later.' });
      }
    }
  }

);

// functions

// generate salt
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// hash password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
}

// log registration
async function logRegistration(userId, username, userType) {
  const log = new loginRegisterLogs({ id: userId, type: userType, username, action: 'Register' });
  await log.save();
}

// register owner
async function registerVehicleOwner(ownerData) {

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
  logRegistration(result.rows[0].id, result.rows[0].username, 'Vehicle Owner');
  return result;

}

// register center
async function registerServiceOrRepairCenter(centerData) {
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
      throw new Error('Invalid center type');
  }
  logRegistration(result.rows[0].id, result.rows[0].username, type);

  return result;
}

// create schema and tables for centers
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
      vehicle_id INTEGER NOT NULL REFERENCES ${schemaName}.clients(id),
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


  } catch (error) {
    console.error('Error creating schema and tables:', error.message);
    throw new Error('Failed to create schema and tables.');
  } finally {
    client.release();
  }
}

// Function to check if username is already taken
async function isUsernameAlreadyTaken(username) {
  try {
    // Query the schema_mapping table
    const schemaQueryResult = await pool.query(`
      SELECT * FROM "carConnectPro".schema_mapping WHERE username = $1
    `, [username]);
    return schemaQueryResult.rows.length > 0; // Return true if username exists, false otherwise
  } catch (error) {
    console.error('Error checking username:', error.message);
    throw new Error('Failed to check username availability');
  }
}

// function to insert into schema_mapping table 
async function insertToSchemaMapping(username, schemaName) { 
  try {
    const schemaMappingQuery = await pool.query(`
      INSERT INTO "carConnectPro"."schema_mapping" (username, schema) VALUES ($1, $2)
    `, [username, schemaName]);
    console.log(`Inserted ${username} into schema_mapping table for schema ${schemaName}`);
  } catch { 
    console.error('Error inserting into schema_mapping table:', error.message);
    throw new Error('Failed to insert into schema_mapping table');
  }
}
module.exports = router;
