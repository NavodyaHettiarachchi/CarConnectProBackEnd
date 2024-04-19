const pool = require('../db/db');
const comFunc = require('../functions/commonFunctions');
const AppError = require('../utils/appError');
const logController = require('./logController');
const jwt = require("jsonwebtoken");

// @ DESCRIPTION      => Sign Token
// @ ENDPOINT         => ------------------
// @ ACCESS           => -----------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

// @ DESCRIPTION      => Create Token
// @ ENDPOINT         => ------------------
// @ ACCESS           => -----------------
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

const createSendToken = (user, schema, table, statusCode, req, res) => {

  const token = signToken(user.id);

  const cookieOptions = {
    expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  // cookies are only sent via http
  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //ADD HERE ROLETYPE @HARINDU ASHEN

  let roleType;

  if (table === 'owner') {
    roleType = 'owner';
  } else if (table === 'center') {
    roleType = 'center';
  } else if (table === 'employee') {
    roleType = 'employee';
  } else { 
    roleType = 'admin';
  }

  res.status(statusCode).json({
    token,
    status: "sucess",
    showQuickNotification: true,
    data: {
      user,
      schema,
      roleType,
    },
  });
};

// @ DESCRIPTION      => Login Controller
// @ ENDPOINT         => /login
// @ ACCESS           => All owners, center admins and center employees
// @ CREATED BY       => Navodya Hettiarachchi
// @ CREATED DATE     => 2024/02/23

exports.login = async (req, res, next) => {

  const { username, password } = req.body;

  const findSchema = await pool.query(`
      SELECT schema FROM "carConnectPro"."schema_mapping" WHERE username = $1
    `, [username]);

  if (findSchema.rows.length === 0) {
    return next(
      new AppError("Invalid Username or Password", 404)
    )
  }
  let userData;
  let schema = findSchema.rows[0].schema;
  let table;



  const checkIfCenterSuperAdmin = await pool.query(`
      SELECT * FROM "carConnectPro"."center" 
      WHERE username = $1
    `, [username]);


  if (checkIfCenterSuperAdmin.rows.length > 0) {

    if (!comFunc.validatePassword(password, checkIfCenterSuperAdmin.rows[0].salt, checkIfCenterSuperAdmin.rows[0].password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    let userData = checkIfCenterSuperAdmin.rows[0];
    userData.id = userData.center_id;
    // login logs
    await logController.logLoginRegister({ id: userData.id, type: schema, username: userData.username, action: 'login' }, res, next);
    console.log("Center user ID:", userData.id);
    delete userData.password;
    delete userData.salt;
    table = "center";
    createSendToken(userData, schema, table, 200, req, res);
  }

  else {
    let userData;

    if (schema == "carConnectPro") {
      table = "owner";
      const result = await pool.query(`
          SELECT * FROM "carConnectPro".${table} WHERE username = $1
        `, [username]);
      // validate password
      if (!comFunc.validatePassword(password, result.rows[0].salt, result.rows[0].password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      userData = result.rows[0];
      // login logs
      await logController.logLoginRegister({ id: userData.id, type: "Vehicle Owner", username: userData.username, action: "login" }, res, next);
    }
    else {
      table = "employee";
      const result = await pool.query(`
        SELECT et.id, et.username, et.password, et.salt, rt.privileges AS roles
        FROM ${schema}."employee" AS et
        INNER JOIN ${schema}."roles" AS rt
        ON et.roles = rt.id
        WHERE username = $1 
      `, [username]);

      // validate password
      if (!comFunc.validatePassword(password, result.rows[0].salt, result.rows[0].password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      userData = result.rows[0];
      userData.schema = schema;
      // logging of login
      await logController.logLoginRegister({ id: userData.id, type: schema + " employee", username: userData.username, action: "login" }, res, next);
    }

    // If user is found and password is correct
    delete userData.password;
    delete userData.salt;
    createSendToken(userData, schema, table, 200, req, res);
  }

};
