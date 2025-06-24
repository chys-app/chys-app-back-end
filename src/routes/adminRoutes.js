const express = require('express');
const router = express.Router();
const { adminSignup, adminLogin } = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.post('/signup', adminSignup);
router.post('/login', adminLogin);

// Protected routes (example - you can add more admin-specific routes here)
router.get('/profile', adminAuth, (req, res) => {
  res.json({ 
    message: 'Admin profile accessed successfully',
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      createdAt: req.admin.createdAt
    }
  });
});

module.exports = router;
