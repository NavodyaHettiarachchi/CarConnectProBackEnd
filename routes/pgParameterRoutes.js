const express = require('express');
const parameterController = require('../controllers/parameterController');

const router = express.Router();

// Gender table

router.get('/gender', parameterController.getGender);

// Fuel type

router.get('/fuelType', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  parameterController.getFuelType(req, res, next);
});

// transmission type

router.get('/transmissionType', (req, res, next) => { 
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  parameterController.getTransmissionType(req, res, next);
});

// center type

router.get('/centers', parameterController.getCenters);

module.exports = router;