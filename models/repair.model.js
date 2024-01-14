const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
// const jwt = require('jsonwebtoken');
// const secret = require('../.env').secret;
const Schema = mongoose.Schema;

const repairCenterSchema = new Schema({
  username: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "can't be blank"],
    match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
    index: true,
  },
  salt: {
    type: String,
  },
  pwdHash: {
    type: String,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    }
  },
  services: [{
    service_id: {
      type: String,
      required: false,
    },
    service_name: {
      type: String,
      required: false,
    },
    service_description: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: false,
    }
  }],
  employees: [{
    employee_id: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    position: {
      type: String,
      required: false,
    }
  }]
}, {
  timeseries: true,
});

// repairCenterSchema.plugin(uniqueValidator, { message: 'is Already Taken' });

repairCenterSchema.methods.setPassword = function (password){ 
  this.salt = crypto.randomBytes(16).toString('hex');
  this.pwdHash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
}

repairCenterSchema.methods.validatePassword = function (password) { 
  let pwd = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
  return this.pwdHash == pwd;
}

repairCenterSchema.methods.authJSON = function () { 
  return ({
    location: {
      address: this.location.address,
      city: this.location.city,
      province: this.location.province,
    },
    contactInfo: {
      phone: this.contactInfo.phone,
      email: this.contactInfo.email,
    },
    name: this.name,
    email: this.email,
    username: this.username,
    id: this._id,
    services: this.services,
    employees: this.employees,
  });
}

// repairCenterSchema.methods.generateJWT = function () {
//   let today = new Date();
//   let exp = new Date(today);
//   exp.setDate(today.getDate() + 30);

//   const payload = {
//     id: this._id,
//     name: this.name,
//     exp: parseInt(exp.getTime() / 1000),
//   };
  
//   return jwt.sign(payload, secret);
// };


// repairCenterSchema.methods.authJSON = function () {
//   const repCenter = this.toObject();
//   delete repCenter._id;
//   delete repCenter.pwdHash
//   repCenter.token = this.generateJWT();

//   return repCenter;
// };

//Pre-save middleware to generate service ID for services
repairCenterSchema.pre('save', function (next) {
  // looping through each service in array
  this.services.forEach(service => { 
    if (!service.service_id) {
      // Generate unique Service ID
      service.service_id = Math.random().toString(36).substring(7);
    }
  })
  this.employees.forEach(emp => { 
    if (!emp.employee_id) { 
      // Generate unique emp ID
      emp.employee_id = Math.random().toString(36).substring(7);
    }
  })
  next();
});



const RepairCenter = mongoose.model('RepairCenter', repairCenterSchema);

module.exports = RepairCenter;