const express = require('express');
const router = express.Router();
const { adminSignup, adminLogin } = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const donationController = require('../controllers/donationController');
const { upload } = require('../config/cloudinary');


router.post('/signup', adminSignup);
router.post('/login', adminLogin);
router.get('/dashboardDetails', adminAuth, donationController.getDashboardStats)


router.get('/',adminAuth, donationController.getAllDonations);
router.get('/:id',adminAuth ,donationController.getDonationById);


router.post('/', adminAuth, upload.single('image'), donationController.createDonation);
router.put('/:id', adminAuth, upload.single('image'), donationController.updateDonation);
router.delete('/:id', adminAuth, donationController.deleteDonation);


module.exports = router;
