const express = require('express');
const { check, validationResult } = require('express-validator');
const ownerController = require('../controllers/ownerController');

const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Get all owners for sy admin
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, name, gender, dob, street_1, street_2, city, province, phone, email, profile_pic, roles, nic
      FROM "carConnectPro".owner
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

// get profile of vehicle owner

router.get('/profile/:userId', ownerController.getProfile);

// update profile information of owner

router.patch('/profile/:userId', [
  check('name').optional().trim().notEmpty().withMessage('Name is required'),
  check('street_1').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('street_2').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('city').optional().trim().isString().withMessage('Invalid City Name'),
  check('province').optional().trim().isString().withMessage('Invalid Province'),
  check('phone').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
 ] , async (req, res,next) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: "failed",
      showQuickNotification: true,
      message: "Invalid inputs",
      errors: errors.array() });
  }
  ownerController.updateProfile(req, res, next);
})

// Get owner vehicles

router.post('/vehicles', ownerController.getVehicles);

// Add owner vehicle

router.post('/vehicle', upload.fields([
  { name: 'photo_1', maxCount: 1 },
  { name: 'photo_2', maxCount: 1 },
  { name: 'photo_3', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]) ,ownerController.addVehicle);

// Get owner vehicle data

router.post('/vehicles/:vehicleId', ownerController.getVehicle);

// Get Vehicle history
router.post('/vehicles/:vehicleId/history', ownerController.getVehicleHistory);

// Get filtered vehicle history 
router.post('/vehicles/:vehicleId/filter', ownerController.getFilteredHistory);

module.exports = router;