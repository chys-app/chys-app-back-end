const express = require('express');
const router = express.Router();
const { register, login, getProfile, getAllUsersBasic, updateUserProfile, getUserNotifications, makeUserPremium } = require('../controllers/userController');
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
router.get('/profile/:userId?', auth, getProfile); // Get own profile
router.put('/profile', auth, upload.single('profilePic'), updateUserProfile);
router.get('/notifications', auth, getUserNotifications)

router.post('/premiumUser', auth, makeUserPremium)

module.exports = router; 