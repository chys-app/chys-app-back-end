const express = require('express');
const router = express.Router();
const { register, login, getProfile, getAllUsersBasic, updateUserProfile, updateUserInfo, getUserNotifications, makeUserPremium, updateBankDetails, requestWithdraw, getTransactionHistory, resetPasswordAfterOTP, verifyResetOTP, sendResetOTP, toggleFollow, deleteAccount, sendVerificationOTP, verifyUser, sendVerificationLink, verifyEmailLink, getVerificationStatus, resendVerificationEmail, blockUser, unblockUser, reportUser, getBlockedUsers, getReportedUsers, getUserWithProducts } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const donationController = require('../controllers/donationController');

router.post('/register', upload.single('profilePic'), register);
router.post('/login', login);
router.put('/update-user-info', auth, upload.single('profilePic'), updateUserInfo);
router.post('/send-reset-otp', sendResetOTP);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPasswordAfterOTP);
router.post('/send-verification-otp', auth, sendVerificationOTP);
router.post('/verify', auth, verifyUser);
router.post('/send-verification-link', auth, sendVerificationLink);
router.get('/verify-email', verifyEmailLink);
router.get('/verification-status', auth, getVerificationStatus);
router.post('/resend-verification-email', auth, resendVerificationEmail);

router.get('/', (req, res)=>{
    res.send('Hello World')
})
router.get('/allUsers', auth, getAllUsersBasic)
router.post('/follow-toggle/:userId', auth, toggleFollow);

router.get('/profile/:userId?', auth, getProfile);
router.get('/profile-with-products/:userId?', auth, getUserWithProducts);
router.put('/profile', auth, upload.single('profilePic'), updateUserProfile);
router.get('/notifications', auth, getUserNotifications);

router.post('/premiumUser', auth, makeUserPremium);
router.get('/getDonations',auth, donationController.getAllDonations);
router.post('/updateAmount', auth, donationController.recordDonationTransaction);
router.put('/bank-details', auth, updateBankDetails);
router.post('/withdraw', auth, requestWithdraw);
router.get('/transaction-history', auth, getTransactionHistory);
router.delete('/account', auth, deleteAccount);

// Block and Report User Routes
router.post('/block/:userId', auth, blockUser);
router.delete('/block/:userId', auth, unblockUser);
router.post('/report/:userId', auth, reportUser);
router.get('/blocked-users', auth, getBlockedUsers);
router.get('/reported-users', auth, getReportedUsers);

module.exports = router; 