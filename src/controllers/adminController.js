const Admin = require('../models/Admin');
const Post = require('../models/Post');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserReport = require('../models/UserReport'); // Added UserReport model

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

exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Optional filters (admin can still use them if desired)
    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(",") };
    }

    if (req.query.location) {
      query.location = req.query.location;
    }

    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "creator", select: "name bio profilePic" },
        { path: "likes", select: "_id" },
        { path: "comments.user", select: "_id name profilePic" },
      ])
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all user reports
exports.getAllUserReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await UserReport.find()
      .populate('reporter', '_id name email profilePic')
      .populate('reportedUser', '_id name email profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserReport.countDocuments();

    res.json({
      reports,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReports: total
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user report by ID
exports.getUserReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await UserReport.findById(id)
      .populate('reporter', '_id name email profilePic')
      .populate('reportedUser', '_id name email profilePic')
      .populate('resolvedBy', '_id name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error("Error fetching user report:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update user report status
exports.updateUserReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (adminNotes) updateData.adminNotes = adminNotes;
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.admin._id;
    }

    const report = await UserReport.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('reporter', '_id name email profilePic')
    .populate('reportedUser', '_id name email profilePic')
    .populate('resolvedBy', '_id name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ 
      message: 'Report status updated successfully', 
      report 
    });
  } catch (error) {
    console.error("Error updating user report:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user report
exports.deleteUserReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await UserReport.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ 
      message: 'Report deleted successfully',
      deletedReport: {
        id: report._id,
        reporter: report.reporter,
        reportedUser: report.reportedUser
      }
    });
  } catch (error) {
    console.error("Error deleting user report:", error);
    res.status(500).json({ message: error.message });
  }
};
