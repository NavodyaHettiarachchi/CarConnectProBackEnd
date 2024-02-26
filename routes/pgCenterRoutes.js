const express = require('express');
const { check, validationResult } = require('express-validator');
const centerController = require('../controllers/centerController');

const router = express.Router();

// Get all centers for sys admin


router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT center_id, center_type, username, name, street_1, street_2, city, province, phone, email, roles
      FROM "carConnectPro"."center"
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Couldnt get all centers. Please try again later.' });
  }
});

// get profile of center

router.get('/profile/:id', centerController.getProfile);

// update profile information of center

router.patch('profile/:id', [
  check('name').optional().trim().notEmpty().withMessage('Name is required'),
  check('street_1').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('street_2').optional().trim().notEmpty().withMessage('Invalid Address'),
  check('city').optional().trim().isString().withMessage('Invalid City Name'),
  check('province').optional().trim().isString().withMessage('Invalid Province'),
  check('phone').optional().isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
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
  centerController.updateProfile(req, res, next);
});

// get all employees

router.get('/employee', centerController.getEmployees);

// get an employee of a center

router.get('/employee/:empId', centerController.getEmployee);

// add an employee to a canter

router.post('/employee', [
  check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
  check('password').isLength({ min: 8 }).withMessage('Password must be atleast 8 characters'),
  check('name').trim().isString().withMessage('Name can only be a string'),
  check('contact').isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
  check('email').trim().isEmail().withMessage('Invalid Email'),
  check('gender').isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
  check('dob').isISO8601().toDate().withMessage('Invalid date of birth'),
  check('profile_pic').optional().custom((value) => {
    // Check if profile_pic is provided and is a valid bytea field
    if (!value || !Buffer.isBuffer(value)) {
      throw new Error('Invalid Profile Pic');
    }
    // If validation passes, return true
    return true;
  }),
  check('nic').trim().isAlphanumeric().isLength({ min: 10, max: 12 }).withMessage('Invalid NIC'),
  check('designation').trim().isString().withMessage('Invalid Designation'),
  check('manager_id').optional().trim().isInt().withMessage('Invalid Manager ID'),
  check('salary').isFloat().withMessage('Invalid salary'),
  check('isActive').isBoolean().withMessage('Invalid active state'),
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
  centerController.updateProfile(req, res, next);
});

// update employee of a center

router.patch('/employee/:empId', [
  check('name').optional().trim().isString().withMessage('Name can only be a string'),
  check('contact').optional().isString().trim().isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
  check('gender').optional().isIn(['M', 'F', 'O']).withMessage('Invalid gender'),
  check('dob').optional().isISO8601().toDate().withMessage('Invalid date of birth'),
  check('profile_pic').optional().custom((value) => {
    // Check if profile_pic is provided and is a valid bytea field
    if (!value || !Buffer.isBuffer(value)) {
      throw new Error('Invalid Profile Pic');
    }
    // If validation passes, return true
    return true;
  }),
  check('designation').optional().trim().isString().withMessage('Invalid Designation'),
  check('manager_id').optional().trim().isInt().withMessage('Invalid Manager ID'),
  check('salary').optional().isFloat().withMessage('Invalid salary'),
  check('isActive').optional().isBoolean().withMessage('Invalid active state'),
  check('roles').isInt().optional().withMessage('Need a role please')
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
  centerController.updateEmployee(req,res, next);
});

// delete an employee of a center

router.delete('/settings/employee/:empId', centerController.deleteEmployee);

// get all roles of center

router.get('/settings/roles', centerController.getAllRoles);

// get one role of a center

router.get('/settings/roles/:roleId', centerController.getRole);

// add role of center

router.post('/settings/roles', [
  check('name').isString().notEmpty().trim().withMessage('Invalid Name'),
  check('description').isString().trim().notEmpty().withMessage('Invalid Descrition'),
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
  centerController.addRole(req, res, next);
});

// edit role of center

router.patch('/settings/roles/:roleId', [
  check('name').isString().optional().notEmpty().trim().withMessage('Invalid Name'),
  check('description').optional().isString().trim().notEmpty().withMessage('Invalid Descrition'),
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
  centerController.updateProfile(req, res, next);
});

// delete role of a center

router.delete('/settings/roles/:roleId', centerController.deleteRole);

// get all parts

router.get('/inventory', centerController.getInventory);

// get a part

router.get('/inventory/:partId', centerController.getPart);

// add a part
router.post('/inventory', [
  check('name').isString().withMessage('Invalid Name'),
  check('description').isString().withMessage('Invalid Description'),
  check('manufacture_country').isString().withMessage('Invalid Manufacture Country'),
  check('quantity').isInt().withMessage('Invalid Quantity'),
  check('price').isFloat().withMessage('Invalid price'),
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
  centerController.addPart(req, res, next);
});

// edit a part

router.patch('/inventory/:partId', [
  check('name').optional().isString().withMessage('Invalid Name'),
  check('description').optional().isString().withMessage('Invalid Description'),
  check('manufacture_country').optional().isString().withMessage('Invalid Manufacture Country'),
  check('quantity').optional().isInt().withMessage('Invalid Quantity'),
  check('price').optional().isFloat().withMessage('Invalid price'),
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
  centerController.updatePart(req, res, next);
});

// delete a part

router.delete('/inventory/:partId', centerController.deletePart);

// get all clients

router.get('/client', centerController.getClients);

// get one client

router.get('/client/:clientId', );

// add one client

router.post('/client', [
  check('vehicle_id').isInt().notEmpty().withMessage('Vehicle Id is invalid'),
  check('date_of_reg').isISO8601().withMessage('Invalid date'),
  check('mileage_on_reg').isFloat().withMessage('Invalid mileage'),
  check('owner_id').isInt().withMessage('Invalid owner id'),
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
  centerController.addClient(req, res, next);
});

// edit one client

router.post('/client/:clientId', [
  check('vehicle_id').optional().isInt().notEmpty().withMessage('Vehicle Id is invalid'),
  check('date_of_reg').optional().isISO8601().withMessage('Invalid date'),
  check('mileage_on_reg').optional().isFloat().withMessage('Invalid mileage'),
  check('owner_id').optional().isInt().withMessage('Invalid owner id'),
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
  centerController.updateClient(req, res, next);
});

// get all ongoing services

router.get('/onGoingServices', centerController.getOnGoingServices);

// get one ongoing service

router.get('/onGoingServices/:serviceId', centerController.getOnGoingService);

// add one ongoing service

router.post('/onGoingServices', [
  check('vehicle_id').isInt().withMessage('Invalid vehicle'),
  check('service_date').isISO8601().withMessage('Invalid Date'),
  check('description').isString().withMessage('Invalid Description'),
  check('mileage').isFloat().withMessage('Invalid mileage'),
  check('cost').isFloat().withMessage('Invalid cost'),
  check('details').isJSON().withMessage('Invalid Details'),
  check('isOngoing').isBoolean().withMessage('Invalid boolean value'),
  check('technician_ids').isArray().withMessage('Please select technicians working on vehicle'),
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
  centerController.addOnGoingService(req, res, next);
});

// edit one ongoing service

router.patch('/onGoingServices', [
  check('vehicle_id').optional().isInt().withMessage('Invalid vehicle'),
  check('service_date').optional().isISO8601().withMessage('Invalid Date'),
  check('description').optional().isString().withMessage('Invalid Description'),
  check('mileage').optional().isFloat().withMessage('Invalid mileage'),
  check('cost').optional().isFloat().withMessage('Invalid cost'),
  check('details').optional().isJSON().withMessage('Invalid Details'),
  check('isOngoing').optional().isBoolean().withMessage('Invalid boolean value'),
  check('technician_ids').optional().isArray().withMessage('Please select technicians working on vehicle'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "failed",
      showQuickNotification: true,
      message: "Invalid inputs",
      error: error.array(),
    });
  }
  centerController.updateOnGoingService(req, res, next);
});

// get all service records

router.get('/services', centerController.getServices);

// get a service record

router.get('/services/:serviceId', centerController.getService);

// get all services for one vehicle

router.get('/services/history/:vehicleId', centerController.getVehicleServiceHistory)

module.exports = router;