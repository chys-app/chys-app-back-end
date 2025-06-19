const express = require('express');
const router = express.Router();
const { register, login, getProfile, getAllUsersBasic, updateUserProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.post('/register', upload.single('profilePic'), register);
router.post('/login', login);
router.get('/', (req, res)=>{
    res.send('Hello World')
})
router.get('/allUsers', auth, getAllUsersBasic)

// Protected routes
router.get('/profile', auth, getProfile); // Get own profile
router.get('/profile/:userId', getProfile); // Get any user's profile
router.put('/profile', auth, upload.single('profilePic'), updateUserProfile);

module.exports = router; 