const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
// const jwt = require('jsonwebtoken');
// const secret = require('../.env').secret;


const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  email: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true },
  pwdhash: String,
  nic: Number,
  name: String,
  salt: String,
  age: Number,
  vehicles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  }]
}, {
  timestamps: true,
})

// const userSchema = new Schema({
// 	username: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
// 	email: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true },
// 	pwdhash: String,
// 	name: String,
// 	NIChash: String,
// 	salt: String,
// 	age: Number,
// 	vehicles: [{
// 		type: mongoose.Schema.Types.ObjectId,
// 		ref: 'Vehicle',
// 	}]
// }, {
// 	timestamps: true,
// })

// userSchema.plugin(uniqueValidator, { message: 'is already taken' });

userSchema.methods.setPassword = function (password) {
	this.salt = crypto.randomBytes(16).toString('hex');
	this.pwdhash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
};

// userSchema.methods.setNIC = function (nic) {
// 	this.NIChash = crypto.pbkdf2Sync(nic, this.salt, 10000, 512, 'sha512');
// };

userSchema.methods.validatePassword = function (password) {
  let hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
  return this.pwdhash == hash;
};

// userSchema.methods.generateJWT = function () {
// 	let today = new Date();
// 	let exp = new Date(today);
// 	exp.setDate(today.getDate() + 30);

// 	return jwt.sign({
// 		id: this._id,
// 		username: this.username,
// 		exp: parseInt(exp.getTime() / 1000),
// 	}, secret);
// };	

userSchema.methods.authJSON = function () { 
  return {
    id: this._id,
		username: this.username,
		// token: this.generateJWT(),
		name: this.name,
    age: this.age,
    nic: this.nic,
		vehicles: this.vehicles
	};
};

const User = mongoose.model('User', userSchema);

module.exports = User;