const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loginRegisterLogsSchema = new Schema({
  id: { type: String },
  type: { type: String },
  username: { type: String },
  action: { type: String },
}, {
  timestamps: true,
})

const loginRegisterLogs = mongoose.model('Login_Register_logs', loginRegisterLogsSchema);

module.exports = loginRegisterLogs;