const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
// routes
const loginRoutes = require('./routes/pgLoginRoutes');
const registerRoutes = require('./routes/pgRegisterRoutes');
const centerRoutes = require('./routes/pgCenterRoutes');
const ownerRoutes = require('./routes/pgOwnerRoutes');
const parameterRoutes = require('./routes/pgParameterRoutes');
const commonRoutes = require('./routes/pgCommonRoutes');
const changePasswordRoutes=require('./routes/pgChangePasswordRoutes')

app.get('/', (req, res) => {
  res.status(200).send("Hello from server side");
});

// middleware

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
})

// app.use(function (req, res, next) {
//   res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
//   res.header('Allow-Control-Allow-Credentials', true);
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,credentials');
//   next();
// })

// routes
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);
app.use('/center', centerRoutes);
app.use('/owner', ownerRoutes);
app.use('/parameter', parameterRoutes);
app.use('/common', commonRoutes);
app.use('/password',changePasswordRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
});

app.use(globalErrorHandler);

module.exports = app;