const pool = require('../db/db');
const comFunc = require('../functions/commonFunctions');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync'); 
const AppError = require('../utils/appError');



// Function to retrieve current password
exports.getCurrentPassword = catchAsync(async (req, res, next) => {
  const { userType, id } = req.params;
  const { prevPassword,SchemaValue} = req.body; // Get the provided password from request body

  console.log('Request Parameters - userType:', userType, 'userId:', id);
  console.log('Provided password:', prevPassword);

  try {
      // Determine schema, table, and ID column name based on user type
      let schema, table, idColumnName;

      switch (userType) {
          case 'owner':
              schema = 'carConnectPro';
              table = 'owner';
              idColumnName = 'id';
              break;
          case 'center':
              schema = 'carConnectPro';
              table = 'center';
              idColumnName = 'center_id';
              break;
          case 'employee':
              schema = SchemaValue;
              table = 'employee';
              idColumnName = 'id';
              break;
          default:
              return res.status(400).json({ error: 'Invalid user type' });
      }

      // Query the database for the stored hashed password and salt using schema, table, and ID
      const queryText = `
          SELECT password, salt FROM "${schema}"."${table}"
          WHERE ${idColumnName} = $1
      `;
      const result = await pool.query(queryText, [id]);

      // Check if the user was found
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Retrieve the stored hashed password and salt
      const { password: storedHashedPassword, salt } = result.rows[0];

      // Use the utility function to validate the password
      const isPasswordValid = comFunc.validatePassword(prevPassword, salt, storedHashedPassword);

      // Log whether the passwords match
      console.log('Password match:', isPasswordValid);

      // Return whether the provided password is correct
      if (isPasswordValid) {
          return res.status(200).json({ correct: true });
      } else {
          return res.status(401).json({ error: 'Invalid password' });
      }

  } catch (error) {
      // Log the error and return a 500 error response
      console.error('Error during password verification:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});




// Function to generate a random salt
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Function to hash password using SHA-512 and a given salt
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
}

// Function to save new password
exports.saveNewPassword = catchAsync(async (req, res, next) => {
  const { userType, id } = req.params;
  const { newPassword } = req.body;

  console.log('Request Parameters - userType:', userType, 'userId:', id);
  console.log('Provided password:', newPassword);
  
  try {
      // Determine schema and table based on userType
      let schema, table, idColumnName;
      switch (userType) {
          case 'owner':
              schema = 'carConnectPro';
              table = 'owner';
              idColumnName = 'id';
              break;
          case 'center':
              schema = 'carConnectPro';
              table = 'center';
              idColumnName = 'center_id';
              break;
          case 'employee':
              schema = req.body.schema;
              table = 'employee';
              idColumnName = 'id';
              break;
          default:
              return res.status(400).json({ error: 'Invalid user type' });
      }

      // Generate new salt and hash for the new password
      const salt = generateSalt();
      const hashedPassword = hashPassword(newPassword, salt);

      // Update user's password and salt in the database
      await pool.query(`
          UPDATE "${schema}"."${table}"
          SET password = $1, salt = $2
          WHERE ${idColumnName} = $3
      `, [hashedPassword, salt, id]);

      console.log(`Password and salt updated for user ID ${id} in table ${schema}.${table}.`);

      // Return success response
      return res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
      console.error('Error saving new password:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});