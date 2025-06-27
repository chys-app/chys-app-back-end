const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin Signup
exports.adminSignup = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin with this email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ email, password: hashedPassword });
    await admin.save();
    return res.status(201).json({ message: 'Admin registered successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );
    return res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all users (with limited information for main screen)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { numericUid: isNaN(search) ? null : parseInt(search) }
        ]
      };
    }

    const users = await User.find(query)
      .select('name email numericUid profilePic role isPremium premiumType premiumExpiry createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    return res.status(200).json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: skip + users.length < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user by ID (detailed information)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password'); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.numericUid;
    delete updateData._id;

    // If updating password, hash it
    if (updateData.newPassword) {
      updateData.password = await bcrypt.hash(updateData.newPassword, 10);
      delete updateData.newPassword;
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ 
      message: 'User updated successfully', 
      user 
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};