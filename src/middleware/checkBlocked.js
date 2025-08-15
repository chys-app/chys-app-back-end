const User = require('../models/User');
const asyncHandler = require('express-async-handler');

const checkBlocked = asyncHandler(async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId || req.body.userId;

    if (!targetUserId) {
      return next();
    }

    const targetUser = await User.findById(targetUserId);
    if (targetUser && targetUser.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({ 
        message: 'You are blocked by this user',
        blocked: true
      });
    }

    // Check if current user has blocked target user
    const currentUser = await User.findById(currentUserId);
    if (currentUser && currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(403).json({ 
        message: 'You have blocked this user',
        blocked: true
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = checkBlocked;
