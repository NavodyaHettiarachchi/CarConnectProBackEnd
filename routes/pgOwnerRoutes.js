const express = require('express');
const pool = require('../db/db');
const { check, validationResult } = require('express-validator');
const profileChangeLogs = require('../models/userProfileChangeLogs.model');


const router = express.Router();

// Get all owners for sy admin
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, name, gender, dob, street_1, street_2, city, province, phone, email, profile_pic, roles, nic
      FROM "carConnectPro".owner
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

// get profile id of vehicle owner

router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query(`
      SELECT id, username, name, gender, dob, nic, street_1, street_2, city, province, email, phone, profile_pic, roles
      FROM person 
      WHERE id = $1
    `, [userId]);
    res.status(200).json(result.rows[0]);
  } catch (err) { 
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/profile/:id', [
  check('name').optional().trim().notEmpty().withMessage('Name is required'),
  check('street_1').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('street_2').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('city').optional().trim().isString().withMessage('Invalid City Name'),
  check('province').optional().trim().isString().withMessage('Invalid Province'),
  check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
 ] , async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
       
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

    sql = sql.substring(0, sql.slice(0, -2));
    sq = sql.concat(" WHERE id = $", count.toString(), " RETURNING id, username, name, gender, dob, nic, street_1, street_2, city, province, email, phone, profile_pic, roles");
    dataArr.push(req.body.id);

    const result = await pool.query(sql, dataArr);

    // logging
    let updatedFields = req.body;
    delete updatedFields.id;
    const updateUser = new profileChangeLogs({ id: req.params.id, username: result.rows[0].username, action: "Update Person", updatedFields: updatedFields });
    await updateUser.save();
    res.status(200).json(result.rows[0]);
  } catch (err) { 
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})

module.exports = router;