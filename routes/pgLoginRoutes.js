const express = require('express');
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const catchAsync = require('../utils/catchAsync');
const router = express.Router();

router.post('/',
  [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
  ],
  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    };
    authController.login(req, res, next);
  })
);

module.exports = router;