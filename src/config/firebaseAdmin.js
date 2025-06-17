const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const serviceAccount = JSON.parse(process.env.service_account); // Parse the string to object

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;