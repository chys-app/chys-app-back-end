const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler  = require('express-async-handler');
const mongoose = require('mongoose');

const PetProfile = require('../models/PetProfile');
const Notification = require('../models/Notification');
const WithdrawRequest = require('../models/WithdrawRequest');
const DonationTransaction = require('../models/DonationTransaction');
const Podcast = require('../models/Podcast');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Stroy = require('../models/Stroy');
const sendEmail = require('../utils/sendEmail');


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

const sendResetOTP = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expires = Date.now() + 10 * 60 * 1000; 

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpires = new Date(expires);
  user.resetPasswordOTPVerified = false;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Reset Password OTP',
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });

  res.json({ message: 'OTP sent to email' });
};

const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.resetPasswordOTPVerified = true;
  await user.save();

  res.json({ message: 'OTP verified successfully' });
};

const resetPasswordAfterOTP = async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordOTPVerified) {
    return res.status(400).json({ message: 'OTP not verified' });
  }

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;
  user.resetPasswordOTPVerified = false;

  await user.save();

  res.json({ message: 'Password reset successfully' });
};

const getProfile = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const userId = req.params.userId || loggedInUserId;

    const isOwnProfile = userId.toString() === loggedInUserId.toString();

    // Get user profile without password
    const user = await User.findById(userId)
      .select('-password')
      .populate('followers', '_id')  // Only get IDs for count
      .populate('following', '_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all pet profiles for this user
    const petProfiles = await PetProfile.find({ user: userId });

    // Determine if logged-in user is following the target user
    let isFollowing = false;
    if (!isOwnProfile) {
      isFollowing = user.followers.some(f => f._id.toString() === loggedInUserId.toString());
    }

    res.json({
      user: {
        ...user.toObject(),
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing: isOwnProfile ? undefined : isFollowing,
        isOwnProfile
      },
      petProfiles
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, bio, address, country, city, zipCode } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Update basic fields
  if (name) user.name = name;
  if (bio) user.bio = bio;
  if (address) user.address = address;
  if (country) user.country = country;
  if (city) user.city = city;
  if (zipCode) user.zipCode = zipCode;

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
      profilePic: user.profilePic,
      address: user.address,
      city: user.city,
      country: user.country,
      zipCode: user.zipCode
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
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    populate: { path: 'creator', select: 'name image' }
  });

  const favoritesWithFlag = user.favorites.map(post => ({
    ...post.toObject(), // convert Mongoose document to plain object
    isFavorite: true
  }));

  res.json({ success: true, favorites: favoritesWithFlag });
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

const updateBankDetails = async (req, res) => {
  try {
    const userId = req.user?._id 
    const {
      accountHolderName,
      routingNumber,
      accountNumber,
      bankName,
      accountType,
      bankAddress
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.bankDetails = {
      accountHolderName,
      routingNumber,
      accountNumber,
      bankName,
      accountType,
      bankAddress
    };

    await user.save();

    return res.status(200).json({ message: 'Bank details updated successfully', bankDetails: user.bankDetails });
  } catch (error) {
    console.error('Error updating bank details:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const requestWithdraw = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = await User.findById(userId);

    if (!user || user.totalFundReceived < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const pending = await WithdrawRequest.findOne({ user: userId, status: 'pending' });
    if (pending) {
      return res.status(400).json({ message: "You already have a pending request" });
    }

    // Create request
    const withdraw = new WithdrawRequest({
      user: userId,
      amount
    });

    await withdraw.save();

    res.status(200).json({ message: "Withdrawal request submitted" });
  } catch (error) {
    console.error("Withdraw error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const getTransactionHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Assuming req.user is populated via auth middleware

  // 1. Donations
  const donations = await DonationTransaction.find({ userId })
    .select('amount donatedAt status')
    .lean();

  const donationHistory = donations.map(d => ({
    type: 'donation',
    amount: d.amount,
    status: d.status,
    date: d.donatedAt,
  }));

  // 2. Podcast funds
  const podcastFunds = await Podcast.find({ 'funds.user': userId })
    .select('funds title')
    .lean();

  const podcastHistory = podcastFunds.flatMap(podcast =>
    podcast.funds
      .filter(f => f.user.toString() === userId)
      .map(f => ({
        type: 'podcast_fund',
        amount: f.amount,
        date: f.createdAt,
        podcastTitle: podcast.title,
      }))
  );

  // 3. Post funds
  const postFunds = await Post.find({ 'funds.user': userId })
    .select('funds description')
    .lean();

  const postHistory = postFunds.flatMap(post =>
    post.funds
      .filter(f => f.user.toString() === userId)
      .map(f => ({
        type: 'post_fund',
        amount: f.amount,
        date: f.createdAt,
        postDescription: post.description,
      }))
  );

  // 4. Withdrawals
  const withdrawals = await WithdrawRequest.find({ user: userId })
    .select('amount status requestedAt paidAt')
    .lean();

  const withdrawalHistory = withdrawals.map(w => ({
    type: 'withdrawal',
    amount: w.amount,
    status: w.status,
    date: w.paidAt || w.requestedAt,
  }));

  // Combine all and sort by date descending
  const allHistory = [
    ...donationHistory,
    ...podcastHistory,
    ...postHistory,
    ...withdrawalHistory
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    sentTransactions: [...donationHistory, ...podcastHistory, ...postHistory].sort((a, b) => new Date(b.date) - new Date(a.date)),
    withdrawals: withdrawalHistory.sort((a, b) => new Date(b.date) - new Date(a.date)),
  });
});

const toggleFollow = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You can't follow/unfollow yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow logic
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== targetUserId.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUserId.toString()
      );
      await currentUser.save();
      await targetUser.save();

      return res.status(200).json({ message: "Unfollowed successfully", isFollowing: false });
    } else {
      // Follow logic
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
      await currentUser.save();
      await targetUser.save();

      return res.status(200).json({ message: "Followed successfully", isFollowing: true });
    }
  } catch (error) {
    console.error("Toggle follow error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    // Verify password before deletion
    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Start a database session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete user's pet profiles
      await PetProfile.deleteMany({ user: userId }, { session });

      // Delete user's posts
      await Post.deleteMany({ creator: userId }, { session });

      // Delete user's stories
      await Stroy.deleteMany({ userId: userId }, { session });

      // Delete user's podcasts
      await Podcast.deleteMany({ user: userId }, { session });

      // Delete user's messages (both sent and received)
      await Message.deleteMany({
        $or: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }, { session });

      // Delete user's notifications
      await Notification.deleteMany({ userId: userId }, { session });

      // Delete user's withdraw requests
      await WithdrawRequest.deleteMany({ user: userId }, { session });

      // Delete user's donation transactions
      await DonationTransaction.deleteMany({ userId: userId }, { session });

      // Remove user from other users' followers/following lists
      await User.updateMany(
        { followers: userId },
        { $pull: { followers: userId } },
        { session }
      );

      await User.updateMany(
        { following: userId },
        { $pull: { following: userId } },
        { session }
      );

      // Remove user from posts' likes and viewedBy arrays
      await Post.updateMany(
        { likes: userId },
        { $pull: { likes: userId } },
        { session }
      );

      await Post.updateMany(
        { viewedBy: userId },
        { $pull: { viewedBy: userId } },
        { session }
      );

      // Remove user from posts' funds arrays
      await Post.updateMany(
        { 'funds.user': userId },
        { $pull: { funds: { user: userId } } },
        { session }
      );

      // Remove user from podcasts' funds arrays
      await Podcast.updateMany(
        { 'funds.user': userId },
        { $pull: { funds: { user: userId } } },
        { session }
      );

      // Finally, delete the user
      await User.findByIdAndDelete(userId, { session });

      // Commit the transaction
      await session.commitTransaction();

      res.status(200).json({ 
        message: 'Account and all associated data deleted successfully',
        success: true
      });

    } catch (error) {
      // If any operation fails, rollback the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      message: 'Failed to delete account', 
      error: error.message 
    });
  }
};

const sendVerificationOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  user.verificationOTP = otp;
  user.verificationOTPExpires = new Date(expires);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Account',
    html: `<p>Your verification OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });

  res.json({ message: 'Verification OTP sent to email' });
});

const verifyUser = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

  if (
    user.verificationOTP === otp &&
    user.verificationOTPExpires &&
    user.verificationOTPExpires > new Date()
  ) {
    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    await user.save();
    return res.json({ message: 'User verified successfully', isVerified: true });
  } else {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
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
  makeUserPremium,
  updateBankDetails,
  requestWithdraw,
  getTransactionHistory,
  sendResetOTP,
  verifyResetOTP,
  resetPasswordAfterOTP,
  toggleFollow,
  deleteAccount,
  sendVerificationOTP,
  verifyUser
}; 