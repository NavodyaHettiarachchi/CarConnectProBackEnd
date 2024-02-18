const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const updateProfileSchema = new Schema({
  id: { type: String },
  username: { type: String },
  type: { type: String },
  action: { type: String },
  updatedFields: {
    type: Object
  },
}, {
  timestamps: true,
});

const updateProfileLogs = mongoose.model('UpdateProfileLogs', updateProfileSchema);

module.exports = updateProfileLogs;