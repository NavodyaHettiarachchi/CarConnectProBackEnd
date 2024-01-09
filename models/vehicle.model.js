const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../.env').secret;

const Schema = mongoose.Schema;

const vehicleSchema = new Schema({
  numberPlate: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  model: String,
  make: String,
  engineHash: String,
  salt: String,
  chassisHash: String,
  odm: Number,
  transmissionType: String,
  fuelType: String,
  dateOfRegistration: Date,
  seatingCapacity: Number,
}, {
  timestamps: true,
})

vehicleSchema.plugin(uniqueValidator, { message: 'is already taken' });

vehicleSchema.methods.setEngine = function (engine) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.engineHash = crypto.pbkdf2Sync(engine, salt, 10000, 512, 'sha512');
};

vehicleSchema.methods.setChassis = function (chassis) {
  this.chassisHash = crypto.pbkdf2Sync(chassis, salt, 10000, 512, 'sha512');
};

vehicleSchema.methods.generateJWT = function () {
  let today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 30);

  return jwt.sign({
    id: this._id,
    numberPlate: this.numberPlate,
    odm: this.odm,
    model: this.model,
    make: this.make,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

vehicleSchema.methods.authJSON = function () {
  return {
    token: this.generateJWT(),
    seatingCapacity: this.seatingCapacity,
    transmissionType: this.transmissionType,
    fuelType: this.fuelType,
    dateOfRegistration: this.dateOfRegistration,
  };
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;