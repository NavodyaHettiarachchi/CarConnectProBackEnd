const express = require('express');
const parameterController = require('../controllers/parameterController');

const router = express.Router();

// Gender table

router.get('/gender', parameterController.getGender);

// Fuel type

router.get('/fuelType', parameterController.getFuelType);

// transmission type

router.get('/transmissionType', parameterController.getTransmissionType);

module.exports = router;