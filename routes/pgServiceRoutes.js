const express = require('express');
const pool = require('../db/db');
const { check, validationResult } = require('express-validator');
const profileChangeLogs = require('../models/userProfileChangeLogs.model');
const crypto = require('crypto');
const loginRegisterLogs = require('../models/loginRegisterLogs.model');

const router = express.Router();

// Get all centers for sys admin


router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT center_id, center_type, username, name, street_1, street_2, city, province, phone, email, roles
      FROM "carConnectPro"."center"
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(err);
    return res.status(500).json({ error: 'Couldnt get all centers. Please try again later.' });
  }
});

// get prodile of center

router.get('/profile/:id', async (req, res) => {
  try {
    const centerId = req.params.id;
    const result = await pool.query(`
      SELECT center_type, username, name, email, phone, street1, street2, city, province, roles
      FROM "carConnectPro"."center" 
      WHERE id = $1 AND type in ($2, $3)
    `, [centerId, "S", "B"]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Couldn\'t get profile information. Please try again later.' });
  }
});

// update profile information of center

router.patch('profile/:id', [
  check('name').optional().trim().notEmpty().withMessage('Name is required'),
  check('street1').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('street2').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('city').optional().trim().isString().withMessage('Invalid City Name'),
  check('province').optional().trim().isString().withMessage('Invalid Province'),
  check('phone').optional().isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const sql = `
      UPDATE "carConnectPro"."center"
      SET 
    `;
    const dataArr = [];
    let count = 1;
    for (let key in req.body) {
      if (key !== 'id') {
        sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key])
      }
    }
    sql = sql.substring(0, sql.slice(0, -2));
    sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
    dataArr.push(req.body.id);

    const result = await pool.query(sql, dataArr);

    const updateCenter = new profileChangeLogs({ id: req.params.id, username: result.rows[0].username, action: "Update Service Center", updatedFields: req.body });
    await updateCenter.save();
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Couldn\'t update profile information. Please try again later.' });
  }
});

// get all employees

router.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, username, profile_pic, email, contact, mic, gender, manager_id, designation, salary, roles, isActive
      from "${req.body.schemaName}"."employee"
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error while getting employees of ", req.body.schema, error)
    return res.status(500).json({ error: "Failed to get roles. Please try again later." });
  }
});

// get an employee of a center

router.get('/employees/:empId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT id, name, username, profile_pic, email, contact, mic, gender, manager_id, designation, salary, roles, isActive
      FROM "${req.body.schema}"."employee" WHERE ID = $1
    `, [req.params.empId]);

    return res.status(200).json(result.rows[0]);
  } catch (error) { 
    console.error("Error while getting employee of id ", req.params.empId, req.body.schema, error);
    return res.status(500).json("Failed to get employee information. Please try again later.");
  }
});

// add an employee to a canter

router.post('/employee', [
  check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
  check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters'),
  check('name').trim().isString().withMessage('Name can only be a string'),
  check('contact').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
  check('email').trim().isEmail().withMessage('Invalid Email'),
  check('gender').isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
  check('dob').isISO8601().toDate().withMessage('Invalid date of birth'),
  check('profile_pic').optional().withMessage('Invalid Profile Pic'),
  check('nic').trim().isAlphanumeric().isLength({ min: 10, max: 12 }).withMessage('Invalid NIC'),
  check('designation').trim().isString().withMessage('Invalid Designation'),
  check('manager_id').optional().trim().isInt().withMessage('Invalid Manager ID'),
  check('salary').isFloat().withMessage('Invalid salary'),
  check('isActive').isBoolean().withMessage('Invalid active state'),
], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { username, password, name, gender, dob, contact, email, nic, manager_id, salary, isActive, profile_pic, designation, roles } = req.body;
    const salt = generateSalt();
    const pwdhash = hashPassword(password, salt);

    // Checking username uniqueness for schema_mapping table
    const isUsernameTaken = await isUsernameAlreadyTaken(username);
    if (isUsernameTaken) {
      return res.status(400).json({ error: 'Username is already taken' });
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
    }

    if (role !== null) {
      userData.roles = roles
    } else { 
      userData.roles = 1
    }
    const result = await pool.query(`
      INSERT INTO "${req.body.schema}"."employee" (name, username, salt, password, profile_pic, email, contact, dob, nic, gender, manager_id, designation, salary, roles, isActive)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, username, profile_pic, email, contact, nic, gender, manager_id, designation, salary, roles, isActive
    `, [
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
      empData.roles,
      empData.isActive
    ]);

    // logging
    logRegistration(result.rows[0].id, result.rows[0].username, 'Employee of ' + req.body.schema.toString());

    return res.status(201).json(result.rows[0]);

  } catch (error) { 
    console.error("Error adding employee ", req.body.schema, error);
    return res.status(500).json("Failed to add employee. Please try again later.");
  }

});

// update employee of a center

router.patch('/employee/:empId', [
  check('name').optional().trim().isString().withMessage('Name can only be a string'),
  check('contact').optional().isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
  check('gender').optional().isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
  check('dob').optional().isISO8601().toDate().withMessage('Invalid date of birth'),
  check('profile_pic').optional().withMessage('Invalid Profile Pic'),
  check('designation').optional().trim().isString().withMessage('Invalid Designation'),
  check('manager_id').optional().trim().isInt().withMessage('Invalid Manager ID'),
  check('salary').optional().isFloat().withMessage('Invalid salary'),
  check('isActive').optional().isBoolean().withMessage('Invalid active state'),
  check('roles').isInt().optional().withMessage('Need a role please')
], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    let sql = `
      UPDATE "${req.body.schema}"."employee" SET
    `;
    const dataArr = [];
    let count = 1;
    for (let key in req.body) {
      if (key !== 'id' && key !== 'schema') {
        sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key])
      }
    }
    sql = sql.substring(0, sql.slice(0, -2));
    sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING id, name, username, profile_pic, email, contact, nic, gender, manager_id, designation, salary, roles, isActive");
    dataArr.push(req.params.empId);

    const result = await pool.query(sql, dataArr);
    return res.status(200).json(result.rows[0]);
  } catch (error) { 
    console.error('Error while updating employee ', req.body.schema, error);
    return res.status(500).json("Failed to update employee. Please try again later.");
  }
});

// delete an employee of a center

router.delete('/settings/employee/:empId', async (req, res) => { 
  try { 
    await pool.query(`
      DELETE FROM "${req.body.schema}"."employee" WHERE id = $1
    `, [req.params.empId]);

    return res.status(200).json("Successfully deleted employee");
  } catch (error) {
    console.error('Error while deleting employee ', req.body.schema, req.params.empId);
  }
})

// get all roles of center

router.get('/settings/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, privileges 
      FROM "${req.body.schema}"."roles"
    `);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error getting roles ", req.body.schema, error);
    return res.status(500).json({ error: "Failed to get roles. Please try again later." });
  }
});

// get one role of a center

gouter.get('/settings/roles/:roleId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "${req.body.schema}"."roles" WHERE id = $1
    `, [req.params.roleId]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error getting role of id ", req.params.roleId, req.body.schema, error);
    return res.status(500).json("Failed to get role information. Please try again.");
  }
});

// add role of center

router.post('/settings/roles', [
  check('name').isString().notEmpty().trim().withMessage('Invalid Name'),
  check('description').isString().trim().notEmpty().withMessage('Invalid Descrition'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await pool.query(`
        INSERT INTO "${req.body.schema}".roles (name, description, privileges) 
        VALUES ($1, $2, $3) RETURNING *
      `, [req.body.name, req.body.description, req.body.privileges]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error while adding role ", req.body.schema, error);
    return res.status(500).json({ error: "Failed to add role. Please try again later." });
  }
});

// edit role of center

router.patch('/settings/roles', [
  check('name').isString().optional().notEmpty().trim().withMessage('Invalid Name'),
  check('description').optional().isString().trim().notEmpty().withMessage('Invalid Descrition'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    let sql = `UPDATE "${req.body.schema}"."roles" SET`
    const dataArr = [];
    let count = 1;
    for (let key in req.body) {
      if (key !== 'id' && key !== 'schema') {
        sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key])
      }
    }
    sql = sql.substring(0, sql.slice(0, -2));
    sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
    dataArr.push(req.body.id);
    const result = await pool.query(sql, dataArr);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error while editting role ", req.body.schema, error);
    return res.status(500).json({ error: 'Failed to edit role. Please try again later.' })
  }
});

// delete role of a center

router.delete('/settings/role', async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM "${req.body.schema}"."roles" WHERE id = $1
    `, [req.body.id]);

    return res.status().json({ message: 'Successfully deleted.' });
  } catch (error) {
    console.error("Error deleting role ", req.body.schema, error);
    return res.status(500).json({ error: 'Failed to delete role. Please try again later.' });
  }
});

// get all parts

router.get('/inventory', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * "${req.body.schema}"."part"
    `);

    return res.status(200).json(result.rows);
  } catch (error) { 
    console.error('Error while getting all parts, ', req.body.schema, error);
    return res.status(500).json("Getting parts failed. Please try again later.");
  }
});

// get a part

router.get('/inventory/:partId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * "${req.body.schema}"."part" WHERE id = $1
    `, [req.params.partId]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error while getting part, ', req.body.schema, req.params.partId, error);
    return res.status(500).json("Getting parts failed. Please try again later.");
  }
});

// add a part
router.post('/inventory', [
  check('name').isString().withMessage('Invalid Name'),
  check('description').isString().withMessage('Invalid Description'),
  check('manufacture_country').toString().withMessage('Invalid Manufacture Country'),
  check('quantity').isInt().withMessage('Invalid Quantity'),
  check('price').isFloat.withMessage('Invalid price'),
], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, description, manufacture_country, quantity, price } = req.body;
    const result = await pool.query(`
      INSERT INTO "${req.body.schema}"."part" (name, description, manufacture_country, quantity, price)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [name, description, manufacture_country, quantity, price]);

    return res.status(201).json(result.rows[0]);
  } catch (error) { 
    console.error('Error adding part ', req.body.schema, error);
    return res.status(500).json('Failed to add part. Please try again later.');
  }
});

// edit a part

router.patch('/inventory/:partId', [
  check('name').optional().isString().withMessage('Invalid Name'),
  check('description').optional().isString().withMessage('Invalid Description'),
  check('manufacture_country').optional().toString().withMessage('Invalid Manufacture Country'),
  check('quantity').optional().isInt().withMessage('Invalid Quantity'),
  check('price').optional().isFloat.withMessage('Invalid price'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, manufacture_country, quantity, price } = req.body;

    let sql = `UPDATE "${req.body.schema}"."part" SET`
    const dataArr = [];
    let count = 1;
    for (let key in req.body) {
      if (key !== 'id' && key !== 'schema') {
        sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key])
      }
    }
    sql = sql.substring(0, sql.slice(0, -2));
    sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
    dataArr.push(req.body.id);
    const result = await pool.query(sql, dataArr);
    return res.status(200).json(result.rows[0]);
  } catch (error) { 
    console.error('Error while updating part ', req.body.schema, req.params.partId, error);
    return res.status(500).json('Failed to update part. Please try again later.');
  }
});

// delete a part

router.delete('/inventory/:partId', async (req, res) => { 
  try {
    await pool.query(`
      DELETE FROM "${req.body.schema}"."part" WHERE id = $1
    `, [req.params.partId]);

    return res.status(200).json('Successfully deleted part');
  } catch (error) { 
    console.error('Error delete part ', req.body.schema, error);
    return res.status(500).json('Failed to delete part. Please try again later.');
  }
});

// get all ongoing services

router.get('/onGoingServices', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sr.id AS service_record_id,
        sr.vehicle_id,
        sr.service_date,
        sr.description,
        sr.mileage,
        sr.cost,
        sr.details,
        array.agg(st.technician_id) AS technicians
      FROM 
        "${req.body.schema}"."service_records" AS sr
      JOIN 
        "${req.body.schema}"."service_technician" AS st ON sr.id = st.service_id
      WHERE 
        sr.isOngoing = $1
      GROUP BY
        sr.id, sr.vehicle_id, sr.service_date, sr.description, sr.mileage, sr.cost, sr.details
    `, [true]);

    return res.status(200).json(result.rows);
  } catch (error) { 
    console.error('Error finding ongoing services ', error);
    return res.status(500).json('Error getting all ongoing service records. Please try again later.')
  }
}); 

// get one ongoing service

router.get('/onGoingServices/:serviceId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT
        sr.id,
        sr.vehicle_id,
        sr.service_date,
        sr.description,
        sr.mileage,
        sr.cost,
        sr.details,
        array.agg(st.technician_id) AS technicians
      FROM
        "${req.body.schema}"."service_records" AS sr
      JOIN 
        "${req.body.schema}"."service_technician" AS st ON sr.id = st.service_id
      WHERE 
        sr.isOngoing = $1 AND sr.id = $2
      GROUP BY
        sr.id, sr.vehicle_id, sr.service_date, sr.description, sr.mileage, sr.cost, sr.details
    `, [true, req.params.serviceId]);

    return res.status(200).json(result.rows[0]);
  } catch (error) { 
    console.error('Error Finding one ongoing service ', req.body.schema, req.params.serviceId, error);
    return res.status(500).json('Failed to get information on service record. Please try again later.');
  }
});

// add one ongoing service

router.post('/onGoingServices', [
  check('vehicle_id').isInt().withMessage('Invalid vehicle'),
  check('service_date').isISO8601().withMessage('Invalid Date'),
  check('description').isString().withMessage('Invalid Description'),
  check('mileage').isFloat().withMessage('Invalid mileage'),
  check('cost').isFloat().withMessage('Invalid cost'),
  check('details').isJSON().withMessage('Invalid Details'),
  check('isOngoing').isBoolean().withMessage('Invalid boolean value'),
  check('technician_ids').isArray().withMessage('Please select technicians working on vehicle'),
], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { vehicle_id, service_date, description, mileage, cost, details, isOngoing, technician_ids } = req.body;

    const result = await pool.query(`
      INSERT INTO "${req.body.schema}"."service_records" (vehicle_id, service_date, description, mileage, cost, details, isOngoing)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [vehicle_id, service_date, description, mileage, cost, details, isOngoing]);


    for (let i = 0; i < technician_ids.length; i++) { 
      await pool.query(`
        INSERT INTO "${req.body.schema}"."service_technician" (service_id, technicin_id) VALUES ($1, $2)
      `, [result.rows[0].id], technician_ids[i]);
    }

    return res.status(201).json(result.rows[0]);

  } catch (error) { 
    console.error('Error while adding service_record, ', req.body.schema, error);
    return res.status(500).json('Failed to add service. Please try again later');
  }
});

// edit one ongoing service

router.patch('/onGoingServices', [
  check('vehicle_id').optional().isInt().withMessage('Invalid vehicle'),
  check('service_date').optional().isISO8601().withMessage('Invalid Date'),
  check('description').optional().isString().withMessage('Invalid Description'),
  check('mileage').optional().isFloat().withMessage('Invalid mileage'),
  check('cost').optional().isFloat().withMessage('Invalid cost'),
  check('details').optional().isJSON().withMessage('Invalid Details'),
  check('isOngoing').optional().isBoolean().withMessage('Invalid boolean value'),
  check('technician_ids').optional().isArray().withMessage('Please select technicians working on vehicle'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { vehicle_id, service_date, description, mileage, cost, details, isOngoing, technician_ids } = req.body;

    let sql = `UPDATE "${req.body.schema}"."service_records" SET `
    const dataArr = [];
    let count = 1;
    for (let key in req.body) {
      if (key !== 'id' && key !== 'schema' && key !== 'technician_ids') {
        sql = sql.concat((key).toString(), " = $", count.toString(), ", ");
        count++;
        dataArr.push(req.body[key])
      }
    }
    sql = sql.substring(0, sql.slice(0, -2));
    sql = sql.concat(" WHERE id = $", count.toString(), " RETURNING *");
    dataArr.push(req.body.id);
    const result = await pool.query(sql, dataArr);

    const techs = await pool.query(`
      SELECT technician_id FROM "${req.body.schema}"."service_technician" WHERE service_id = $1
    `, [req.body.id]);

    for (let i = 0; i < technician_ids.length; i++) {
      const found = techs.rows.some(tech => tech == technician_ids[i]); 
      if (!found) { 
        await pool.query(`
          INSERT INTO "${req.body.schema}"."service_technician" (service_id, technicin_id) VALUES ($1, $2)
        `, [result.rows[0].id], technician_ids[i]);
      }
    }

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error while adding service_record, ', req.body.schema, error);
    return res.status(500).json('Failed to add service. Please try again later');
  }
});

// get all service records

router.get('/services', async (req, res) => { 
  try { 
    const result = await pool.query(`
      SELECT * FROM "${req.body.schema}"."service_record" WHERE isOngoing = $1
    `, [false]);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting all service records ', req.body.schema, error);
    return res.status(500).json("Failed to get all service records. Please try again later.");
  }
});

// get a service record

router.get('/services/:serviceId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "${req.body.schema}"."service_record" WHERE isOngoing = $1 AND id = $2
    `, [false, req.body.id]);

    return res.status(200).json(result.rows[0]);
  } catch (error) { 
    console.error('Error getting a service record', req.body.schema, error);
    return res.status(500).json("Failed to get service record. Please try again later.");
  }
});

// get all services for one vehicle

router.get('/services/history/:vehicleId', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "${req.body.schema}"."service_record" WHERE isOngoing = $1 AND vehicle_id = $2
    `, [false, req.params.vehicleId]);

    return res.status(200).json(result.rows);
  } catch (error) { 
    console.error('Error getting vehicle service history ', req.body.schema, error);
    return res.status(500).json("Failed to get vehicle history. Please try again later.");
  }
})

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
};

// hash password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
};

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
};

async function logRegistration(userId, username, userType) {
  const log = new loginRegisterLogs({ id: userId, type: userType, username, action: 'Register' });
  await log.save();
};

module.exports = router;