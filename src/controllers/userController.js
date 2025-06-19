const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler  = require('express-async-handler');
const PetProfile = require('../models/PetProfile');

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password, lat, lng, fcmToken, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Get uploaded profilePic URL from Cloudinary
    const profilePic = req.file?.path || '';

    // Create new user
    const user = new User({
      name,
      email,
      password,
      lat,
      lng,
      fcmToken,
      bio,
      profilePic
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Login user
const login = async (req, res) => {
  try {
    const { email, password ,lat, lng, fcmToken} = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    user.lat = lat;
    user.lng = lng;
    user.fcmToken = fcmToken
    await user.save();
    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    // Get user profile
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all pet profiles for this user
    const petProfiles = await PetProfile.find({ user: userId });

    res.json({
      user,
      petProfiles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, bio } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Update fields
  if (name) user.name = name;
  if (bio) user.bio = bio;

  // If a new profile picture is uploaded
  if (req.file?.path) {
    user.profilePic = req.file.path;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      _id: user._id,
      name: user.name,
      bio: user.bio,
      profilePic: user.profilePic
    }
  });
});


const getAllUsersBasic = asyncHandler(async (req, res) => {
  // Step 1: Fetch all users with selected fields
  const users = await User.find({}, '_id name profilePic bio');

  // Step 2: Fetch all pet profiles
  const pets = await PetProfile.find({}, 'user _id name profilePic bio');

  // Step 3: Group pets by userId
  const petMap = {};
  pets.forEach(pet => {
    const userId = pet.user.toString();
    if (!petMap[userId]) petMap[userId] = [];
    petMap[userId].push({
      _id: pet._id,
      name: pet.name,
      profilePic: pet.profilePic,
      bio: pet.bio
    });
  });

  // Step 4: Build final response with user info + pets
  const response = users.map(user => ({
    _id: user._id,
    name: user.name,
    profilePic: user.profilePic,
    bio: user.bio,
    pets: petMap[user._id.toString()] || []
  }));

  res.json({ success: true, users: response });
});

const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50); // Optional limit

  res.json({
    success: true,
    count: notifications.length,
    notifications,
  });
});


module.exports = {
  register,
  login,
  getProfile,
  getAllUsersBasic,
  updateUserProfile,
  getUserNotifications
}; 