const { check, validationResult } = require('express-validator');
const router = require('express').Router();
const ServiceCenter = require('../models/service.model');


// Repair Center Registration

router.post(
  '/register',
  [
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
    check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters'),
    check('name').trim().isString().withMessage('Name can only be a string'),
    check('address').trim().notEmpty().withMessage('Invalid Address'),
    check('city').trim().isString().withMessage('Invalid City Name'),
    check('province').trim().isString().withMessage('Invalid Province'),
    check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
    check('email').trim().isEmail().withMessage('Invalid Email'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors });
    }

    const { username, password, name, address, city, province, phone, email } = req.body;

    try {
      const exsistingCenter = await ServiceCenter.findOne({ $or: [{ username, email }] });
      if (exsistingCenter) {
        return res.status(400).json({ message: 'Center name/email already exists' });
      }

      const center = new ServiceCenter({ username, name, location: { address, city, province }, contactInfo: { phone, email } });
      center.setPassword(password);
      await center.save();
      const centerData = await ServiceCenter.findOne({ username });
      res.status(201).json({ message: 'Center Registration Successful', centerData: centerData.authJSON() });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


//Repair Center login

router.post(
  '/login',
  [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const center = await ServiceCenter.findOne({ username });
      if (!center || !center.validatePassword(password)) {
        return res.status(401).json({ message: 'Invalid Credentials' });
      }
      // const token = user.generateJWT();
      // res.json({ token });
      res.json(center.authJSON());
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Repair Center data retrieval

router.get('/:id', async (req, res) => {
  try {
    const center = await ServiceCenter.findById(req.params.id);
    if (!center) {
      return res.status(400).json({ message: 'Center not found' });
    };
    res.json(center.authJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Repair Center Data with Validation

router.patch(
  '/:id',
  [
    check('name').optional().trim().notEmpty().withMessage('Name is required'),
    check('address').optional().trim().notEmpty().withMessage('Invalid Address'),
    check('city').optional().trim().isString().withMessage('Invalid City Name'),
    check('province').optional().trim().isString().withMessage('Invalid Province'),
    check('phone').optional().isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, province, phone } = req.body;

    try {
      const center = await ServiceCenter.findById(req.params.id);
      if (!center) {
        return res.status(400).json({ message: 'Repair Center not found' });
      }
      if (name) center.name = name;
      if (address) center.location.address = address;
      if (city) center.location.city = city;
      if (province) center.location.province = province;
      if (phone) center.contactInfo.phone = phone;

      await center.save();
      res.json(center.authJson());
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// Get all repair Centers

router.get('/', async (req, res) => {
  try {
    const centers = await ServiceCenter.find();
    if (!centers || centers.length == 0) {
      res.status(400).json({ message: 'No repair centers in database' });
    }
    const centerData = centers.map(center => center.authJSON());
    res.json(centerData);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;