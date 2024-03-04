const mongoose = require('mongoose');
const http = require('http');
const https = require('https');
const fs = require('fs');


require('dotenv').config();

const app = require('./app');


// SSL certificate options
const options = {
	key: fs.readFileSync('./certification/key.pem', 'utf-8'),
	cert: fs.readFileSync('./certification/cert.pem', 'utf-8'),
	passphrase: process.env.HTTPS_PASSPHRASE,
};

// Create an HTTP server to handle redirection
const httpServer = http.createServer(app);

// Create an HTTPS server to serve the application
const httpsServer = https.createServer(options, app);


// Handle HTTP requests by redirecting to HTTPS
app.use((req, res, next) => {
	if (req.secure) {
		next();
	} else {
		res.redirect(`https://${req.headers.host}${req.url}`);
	}
});

// Define the ports
const httpPort = 80; // HTTP port
const httpsPort = 443; // HTTPS port

// Start the HTTP server on port 80
httpServer.listen(httpPort, () => {
	console.log(`HTTP server running on port ${httpPort}`);
});

// Start the HTTPS server on port 443
httpsServer.listen(httpsPort, () => {
	console.log(`HTTPS server running on port ${httpsPort}`);
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
