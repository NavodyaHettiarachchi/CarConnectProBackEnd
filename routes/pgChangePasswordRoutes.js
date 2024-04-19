const express = require('express');
const router = express.Router();
const changePasswordController = require('../controllers/changePassowrdController');

// Route to send current password to frontend
router.post('/current/:userType/:id', changePasswordController.getCurrentPassword);

// Route to save new password
router.patch('/current/:userType/:id', changePasswordController.saveNewPassword);

module.exports = router;
