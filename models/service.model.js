const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const serviceCenterSchema = new Schema({
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
  }],
}, {
  timestamps: true,
});

// Methods

serviceCenterSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.pwdHash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
}

serviceCenterSchema.methods.validatePassword = function (password) {
  let pwd = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512');
  return this.pwdHash == pwd;
}

serviceCenterSchema.methods.authJSON = function () { 
  return ({
    id: this._id,
    username: this.username,
    name: this.name,
    location: {
      address: this.location.address,
      city: this.location.city,
      province: this.location.province,
    },
    contactInfo: {
      phone: this.contactInfo.phone,
      email: this.contactInfo.email,
    },
    services: this.services,
    employees: this.employees,
  })
}

//Pre-save middleware to generate service ID for services
serviceCenterSchema.pre('save', function (next) {
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

const ServiceCenter = mongoose.model('ServiceCenter', serviceCenterSchema);

module.exports = ServiceCenter;
