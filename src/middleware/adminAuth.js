const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Check if the token contains admin role
    if (decoded.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const admin = await Admin.findOne({ _id: decoded.id });

    if (!admin) {
      throw new Error();
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: 'Please authenticate as admin' });
  }
};

module.exports = adminAuth; 