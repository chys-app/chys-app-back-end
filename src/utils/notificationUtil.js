const admin = require('../config/firebaseAdmin')
const Notification = require('../models/Notification');
const User = require('../models/User');

const sendNotification = async ({ userIds, title, message, type, data = {} }) => {
  if (!Array.isArray(userIds)) userIds = [userIds];

  // Get users with FCM tokens
  const users = await User.find({
    _id: { $in: userIds },
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

  // Store notifications in DB
  const notifications = userIds.map(userId => ({
    userId,
    title,
    message,
    type,
  }));

  await Notification.insertMany(notifications);
};

module.exports = { sendNotification };