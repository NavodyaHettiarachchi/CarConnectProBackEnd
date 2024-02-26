const express = require('express');
const { check, validationResult } = require('express-validator');
const userController = require('../controllers/registerController');

const router = express.Router();

router.post('/',
  [
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
    check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters'),
    check('name').trim().isString().withMessage('Name can only be a string'),
    check('street_1').trim().notEmpty().withMessage('Invalid Address'),
    check('street_2').trim().notEmpty().withMessage('Invalid Address'),
    check('city').trim().isString().withMessage('Invalid City Name'),
    check('province').trim().isString().withMessage('Invalid Province'),
    check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
    check('email').trim().isEmail().withMessage('Invalid Email'),
    // conditional validation
    check('gender').optional().isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
    check('dob').optional().isISO8601().toDate().withMessage('Invalid date of birth'),
  ], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "failed",
        showQuickNotification: true,
        message: "Invalid inputs",
        error: error.array(),
      });
    }
    userController.register(req, res, next);
  }

);


module.exports = router;
