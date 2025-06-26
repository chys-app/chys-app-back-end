const express = require('express');
const router = express.Router();
const { register, login, getProfile, getAllUsersBasic, updateUserProfile, getUserNotifications, makeUserPremium, updateBankDetails } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const donationController = require('../controllers/donationController');

router.post('/register', upload.single('profilePic'), register);
router.post('/login', login);
router.get('/', (req, res)=>{
    res.send('Hello World')
})
router.get('/allUsers', auth, getAllUsersBasic)


router.get('/profile/:userId?', auth, getProfile);
router.put('/profile', auth, upload.single('profilePic'), updateUserProfile);
router.get('/notifications', auth, getUserNotifications);

router.post('/premiumUser', auth, makeUserPremium);
router.get('/getDonations',auth, donationController.getAllDonations);
router.post('/updateAmount', auth, donationController.recordDonationTransaction);
router.put('/bank-details', auth, updateBankDetails);

module.exports = router; 