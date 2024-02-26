const express = require('express');
const pool = require('../db/db');

const router = express.Router();

// Gender table

router.get('/gender', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "carConnectPro"."gender"
    `);
    return res.status(200).json(result.rows);
  } catch (error) { 
    console.error('Error retrieving gender ', error.message);
    return res.status(500).json('Failed to get gender. Please try again later. ');
  }
});

// Fuel type

router.get('/fuelType', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "carConnectPro"."fuel_type"
    `);
    return res.status(200).json(result.rows);
  } catch (error) { 
    console.error('Error retrieving fuel type ', error.message);
    return res.status(500).json('Failed to get fuel type. Please try again later. ');
  }
});

// transmission type

router.get('/transmissionType', async (req, res) => { 
  try {
    const result = await pool.query(`
      SELECT * FROM "carConnectPro"."transmission_type"
    `);
  } catch (error) { 
    console.error('Error retrieving fuel type ', error.message);
    return res.status(500).json('Failed to get fuel type. Please try again later. ');
  }
});

module.exports = router;