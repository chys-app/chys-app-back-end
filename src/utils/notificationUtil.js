const admin = require('../config/firebaseAdmin')
const Notification = require('../models/Notification');
const User = require('../models/User');

const sendNotification = async ({ userIds, title, message, type, data = {}, senderId = null }) => {
  if (!Array.isArray(userIds)) userIds = [userIds];

  // If senderId is provided, filter out blocked users
  let filteredUserIds = userIds;
  if (senderId) {
    const sender = await User.findById(senderId).select('blockedUsers').lean();
    const blockedUserIds = sender?.blockedUsers || [];
    
    // Find users who have blocked the sender
    const usersWhoBlockedSender = await User.find({ blockedUsers: senderId }).select('_id').lean();
    const blockedByUserIds = usersWhoBlockedSender.map(user => user._id);
    
    // Combine all blocked user IDs
    const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Filter out blocked users
    filteredUserIds = userIds.filter(id => !allBlockedIds.includes(id.toString()));
  }

  // Get users with FCM tokens (excluding blocked users)
  const users = await User.find({
    _id: { $in: filteredUserIds },
    fcmToken: { $ne: null }
  });

  // Prepare FCM messages
  const messages = users.map(user => ({
    token: user.fcmToken,
    notification: {
      title,
      body: message,
    },
    data: {
      type,
      ...data,
    },
  }));

  // Send FCM messages
  await Promise.all(
    messages.map(msg => admin.messaging().send(msg).catch(err => null))
  );

  // Store notifications in DB (only for non-blocked users)
  const notifications = filteredUserIds.map(userId => ({
    userId,
    title,
    message,
    type,
  }));

  await Notification.insertMany(notifications);
};

module.exports = { sendNotification };