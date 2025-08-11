const express = require('express');
const router = express.Router();
const { 
  adminSignup, 
  adminLogin, 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getAllPosts,
  getAllUserReports,
  getUserReportById,
  updateUserReportStatus,
  deleteUserReport
} = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const donationController = require('../controllers/donationController');
const { upload } = require('../config/cloudinary');
const petProfileAdminController = require('../controllers/petProfileAdminController');

// Admin authentication routes
router.post('/signup', adminSignup);
router.post('/login', adminLogin);

// Dashboard
router.get('/dashboardDetails', adminAuth, donationController.getDashboardStats);

// User management routes
router.get('/users', adminAuth, getAllUsers);
router.get('/users/:id', adminAuth, getUserById);
router.put('/users/:id', adminAuth, updateUser);
router.delete('/users/:id', adminAuth, deleteUser);

router.get('/pet-profiles', adminAuth, petProfileAdminController.getAllPetProfiles);
router.get('/pet-profiles/:id', adminAuth, petProfileAdminController.getPetProfileById);
router.put('/pet-profiles/:id', adminAuth, petProfileAdminController.updatePetProfile);
router.delete('/pet-profiles/:id', adminAuth, petProfileAdminController.deletePetProfile);

router.get('/posts', adminAuth, getAllPosts);

// Donation management routes
router.get('/', adminAuth, donationController.getAllDonations);
router.get('/:id', adminAuth, donationController.getDonationById);
router.post('/', adminAuth, upload.single('image'), donationController.createDonation);
router.put('/:id', adminAuth, upload.single('image'), donationController.updateDonation);
router.delete('/:id', adminAuth, donationController.deleteDonation);

// User report management routes
router.get('/user-reports', adminAuth, getAllUserReports);
router.get('/user-reports/:id', adminAuth, getUserReportById);
router.put('/user-reports/:id/status', adminAuth, updateUserReportStatus);
router.delete('/user-reports/:id', adminAuth, deleteUserReport);

// Pet profile management routes

module.exports = router;
