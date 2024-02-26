const loginRegisterLogs = require('../models/loginRegisterLogs.model');
const logChange = require('../models/userProfileChangeLogs.model');

exports.logLoginRegister = async (req, res, next) => { 
  
  let loginObj = {
    id: req.userId,
    type: req.userType,
    username: req.username,
    action: req.action
  }
  const log = new loginRegisterLogs(loginObj);
  await log.save();
}

exports.logProfileChange = async (req, res, next) => { 
  let changeObj = {
    id: req.userId,
    username: req.username, 
    type: req.type,
    action: req.action,
    updatedFields: req.changeLog
  }
  const log = new logChange(changeObj);
  await log.save();
}