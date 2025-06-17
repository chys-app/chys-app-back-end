// config/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('../../chys-12084-firebase-adminsdk-fbsvc-f66e9a39a0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
