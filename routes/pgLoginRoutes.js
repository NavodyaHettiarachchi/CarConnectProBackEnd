const express = require('express');
const pool = require('../db/db');
const { check, validationResult } = require('express-validator');
const loginRegisterLogs = require('../models/loginRegisterLogs.model');
const comFunc = require('../functions/commonFunctions');

const router = express.Router();

router.post('/',
  [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {

      const { username, password } = req.body;


      const findSchema = await pool.query(`
        SELECT schema FROM "carConnectPro"."schema_mapping" WHERE username = $1
      `, [username]);

      if (findSchema.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      let schema = findSchema.rows[0].schema;

      const checkIfCenterSuperAdmin = await pool.query(`
        SELECT * FROM "carConnectPro"."center" 
        WHERE username = $1
      `, [username]);

      if (checkIfCenterSuperAdmin.rows.length > 0) {
        if (!comFunc.validatePassword(password, checkIfCenterSuperAdmin.rows[0].salt, checkIfCenterSuperAdmin.rows[0].password)) { 
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        // login logs
        logLogin(checkIfCenterSuperAdmin.rows[0].id, checkIfCenterSuperAdmin.rows[0].username, schema);
        let userData = checkIfCenterSuperAdmin.rows[0];
        delete userData.password;
        delete userData.salt;
        return res.status(200).json({ message: 'Login successful', userData });
      }

      let table = "";
      let userData;
      if (schema == "carConnectPro") {
        table = "owner";
        const result = await pool.query(`
          SELECT * FROM "carConnectPro".${table} WHERE username = $1
        `, [username]);

        // validate password
        if (!comFunc.validatePassword(password, result.rows[0].salt, result.rows[0].password)) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        userData = result.rows[0];
        // login logs
        logLogin(result.rows[0].id, result.rows[0].username, "Vehicle Owner");
      } else {
        table = "employee";
        const result = await pool.query(`
          SELECT * FROM ${schema}.${table} WHERE username = $1 
        `, [username]);

        // validate password
        if (!comFunc.validatePassword(password, result.rows[0].salt, result.rows[0].password)) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        userData = result.rows[0];
        userData.schema = schema;
        // logging of login
        logLogin(result.rows[0].id, result.rows[0].username, schema + " employee");
      }

      // If user is found and password is correct
      delete userData.password;
      delete userData.salt;
      res.status(200).json({ message: 'Login successful', userData });

    } catch (err) {
      console.error("Error while logging in user: ", err.message);
      res.status(500).json({ error: "Failed to login user. Please try again later." });
    }

  }
);

async function logLogin(userId, username, userType) {
  const log = new loginRegisterLogs({ id: userId, type: userType, username, action: 'Login' });
  await log.save();
}

module.exports = router;