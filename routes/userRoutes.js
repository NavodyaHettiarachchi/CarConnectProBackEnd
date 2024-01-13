const { check, validationResult } = require('express-validator');
const router = require('express').Router();
const User = require('../models/user.model');
// const jwt = require('jsonwebtoken');
// const secret = require('../.env').secret;


// User registration route with validation
router.post(
  '/register',
  [
    check('username').isAlphanumeric().withMessage('Username must be alpha numeric'),
    check('email').isEmail().withMessage('Invalid Email'),
    check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters long'),
    check('name').trim().notEmpty().withMessage('Name is required'),
    check('age').isInt({ min: 16 }).withMessage('You must be of appropriate age to own a vehicle'),
    check('nic').isInt().withMessage('NIC invalid').isLength({ min: 12, max: 12 }),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, name, age, nic } = req.body;

    try {
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      const user = new User({ username, email, name, age, nic });
      user.setPassword(password);
      // user.setNIC(nic);
      await user.save();
      const userData = await User.findOne({ username });
      res.status(201).json({ message: 'User registration successfully', userData: userData.authJSON() });
      // try {
      //   const user = await User.findOne({ username });
      //   // const token = user.generateJWT();
      //   // res.json({ token });
      //   res.json(user.authJSON());
      // } catch (err) {
      //   res.status(500).json({ message: err.message });
      // }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// User login route with validation
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
      const user = await User.findOne({ username });
      if (!user || !user.validatePassword(password)) {
        return res.status(401).json({ message: 'Invalid Credentials' });
      }
      // const token = user.generateJWT();
      // res.json({ token });
      res.json(user.authJSON());
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// User detail retrieve routing

router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    res.json(user.authJSON());
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Update user details route with validation

router.patch(
  '/profile/:id',
  [
    check('name').optional().trim().notEmpty().withMessage('Name is required'),
    check('age').optional().isInt({ min: 16 }).withMessage('Enter an Appropriate age'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, age } = req.body;

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      if (name) user.name = name;
      if (age) user.age = age;
      await user.save;
      res.json(user.authJSON());
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// GET user list

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    if (!users || users.length === 0) {
      return res.status(400).json({ message: 'No users found' });
    }
    const usersData = users.map(user => user.authJSON());
    res.json(usersData);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// // middleware to authenticate token
// function authenticateToken(req, res,next) {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }
//   jwt.verify(token, secret, (err, user) => {
//     if (err) {
//       return res.status(403).json({ message: 'Forbdden' })
//     }
//     req.user = user;
//     next();
//   });
// }

module.exports = router;