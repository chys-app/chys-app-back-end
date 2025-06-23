const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler  = require('express-async-handler');
const PetProfile = require('../models/PetProfile');
const Notification = require('../models/Notification')
const mongoose = require('mongoose')
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

const toggleFavoritePost = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const postId = req.params.postId;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  const isFavorited = user.favorites.includes(postId);

  if (isFavorited) {
    // Remove from favorites
    user.favorites.pull(postId);
    await user.save();
    return res.json({ success: true, message: 'Post removed from favorites' });
  } else {
    // Add to favorites
    user.favorites.push(postId);
    await user.save();
    return res.json({ success: true, message: 'Post added to favorites' });
  }
});

const getFavoritePosts = asyncHandler(async (req, res) => {
  console.log("here")
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    populate: { path: 'creator', select: 'name image' } // optional user info
  });

  res.json({ success: true, favorites: user.favorites });
});

const makeUserPremium = asyncHandler(async (req, res) => {
  const { premiumType } = req.body;
  const userId = req.user._id; // Comes from auth middleware

  if (!premiumType) {
    return res.status(400).json({ message: 'premiumType is required' });
  }

  const validPlans = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!validPlans.includes(premiumType)) {
    return res.status(400).json({ message: 'Invalid premiumType. Choose from: daily, weekly, monthly, yearly.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const now = new Date();
  let expiryDate;

  switch (premiumType) {
    case 'daily':
      expiryDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      expiryDate = new Date(now.setMonth(now.getMonth() + 1));
      break;
    case 'yearly':
      expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      break;
  }

  user.isPremium = true;
  user.premiumType = premiumType;
  user.premiumExpiry = expiryDate;

  await user.save();

  res.status(200).json({
    message: 'User upgraded to premium successfully',
    user: {
      _id: user._id,
      isPremium: user.isPremium,
      premiumType: user.premiumType,
      premiumExpiry: user.premiumExpiry
    }
  });
});

module.exports = {
  register,
  login,
  getProfile,
  getAllUsersBasic,
  updateUserProfile,
  getUserNotifications,
  toggleFavoritePost,
  getFavoritePosts,
  makeUserPremium
}; 