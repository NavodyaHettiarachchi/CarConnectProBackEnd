const express = require('express');

const commonController = require('../controllers/commonController');

const router = express.Router();

router.get('/vehicles', commonController.getVehicles);

module.exports = router;

