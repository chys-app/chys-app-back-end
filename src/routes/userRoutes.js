const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/', (req, res)=>{
    res.send('Hello World')
})

// Protected routes
router.get('/profile', auth, getProfile); // Get own profile
router.get('/profile/:userId', getProfile); // Get any user's profile

module.exports = router; 