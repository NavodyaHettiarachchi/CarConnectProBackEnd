const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri, {});

const connection = mongoose.connection;
connection.once('open', () => {
	console.log("MongoDB database connection established succesfully");
})

// Route handling

// register route
const registerRoute = require('./routes/pgRegisterRoutes');
app.use('/register', registerRoute);

// login route
const loginRoute = require('./routes/pgLoginRoutes');
app.use('/login', loginRoute);




// test
const testRoutes = require('./routes/pgOwnerRoutes');
app.use('/testUser', testRoutes);

const testServiceRouters = require('./routes/pgServiceRoutes');
app.use('/testService', testServiceRouters);


app.listen(port, () => {
	console.log(`Server is running on port: ${port}`)
});