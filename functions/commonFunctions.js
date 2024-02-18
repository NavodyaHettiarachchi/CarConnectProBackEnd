const crypto = require('crypto');

function validatePassword(password, salt, savedPwd) {
  let hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
  let savedPwdBuffer = Buffer.from(savedPwd, 'hex');
  return constantTimeComparison(hash, savedPwdBuffer);;
};

function constantTimeComparison(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}


module.exports = { validatePassword };