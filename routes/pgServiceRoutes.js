const express = require('express');
const pool = require('../db/db');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const loginRegisterLogs = require('../models/loginRegisterLogs.model');
const profileChangeLogs = require('../models/userProfileChangeLogs.model');
const comFunc = require('../functions/commonFunctions');

const router = express.Router();

// Get all centers for sys admin
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT center.*, center_type.description AS center_type
      FROM center
      JOIN center_type ON center.type = center_type.id
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/profile/:id', async (req, res) => {
  try {
    const centerId = req.params.id;
    const result = await pool.query(`
      SELECT type, username, name, email, contact, street1, street2, city, province
      FROM center 
      WHERE id = $1 AND type in ($2, $3)
    `, [centerId, "S", "B"]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('profile/:id', [
  check('name').trim().notEmpty().withMessage('Name is required'),
  check('street1').trim().notEmpty().withMessage('Invalid Address'),
  check('street2').trim().notEmpty().withMessage('Invalid Address'),
  check('city').trim().isString().withMessage('Invalid City Name'),
  check('province').trim().isString().withMessage('Invalid Province'),
  check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const sql = `
        UPDATE center
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
      sql = sql.concat(" WHERE id = $", count, " RETURNING *");
      dataArr.push(req.body.id);

      const result = await pool.query(sql, dataArr);

      const updateCenter = new profileChangeLogs({ id: req.params.id, username: result.rows[0].username, action: "Update Service Center", updatedFields: req.body });
      await updateCenter.save();
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

module.exports = router;