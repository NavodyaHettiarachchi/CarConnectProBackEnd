const mongoose = require('mongoose');

require('dotenv').config();

const app = require('./app');
const port = process.env.PORT || 5000;

app.listen(port, () => {
	console.log(`Server is running on port: ${port}`);
});

// Connect Mongo DB
const uri = process.env.ATLAS_URI;
mongoose.connect(uri, {}).then(() => { 
	console.log('MongoDB Database Connection is ready 👍👍');
}).catch((err) => {
	console.log('MongoDB connection error:', err);
});

module.exports = app;


// need to change password hashing to bcrypt for better hashing
