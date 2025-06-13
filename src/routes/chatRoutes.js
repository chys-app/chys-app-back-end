const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth')

// Get messages between the authenticated user and another user
router.get('/:receiverId', auth, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId },
        { senderId: receiverId, receiverId: req.user._id }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/users', auth, async (req, res) => {
    try {
      const userId = req.user._id;
  
      // Find distinct user IDs from messages
      const messages = await Message.find({
        $or: [
          { senderId: userId },
          { receiverId: userId }
        ]
      });
  
      const chatMap = new Map();
  
      // Find latest message per user
      messages.forEach(msg => {
        const otherUserId =
          msg.senderId.toString() === userId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString();
  
        if (
          !chatMap.has(otherUserId) ||
          msg.timestamp > chatMap.get(otherUserId).timestamp
        ) {
          chatMap.set(otherUserId, {
            lastMessage: msg.message,
            timestamp: msg.timestamp
          });
        }
      });
  
      const userIds = Array.from(chatMap.keys());
  
      const users = await User.find({ _id: { $in: userIds } })
        .select('_id name email');
  
      const result = users.map(user => {
        const chatData = chatMap.get(user._id.toString());
        return {
          user,
          lastMessage: chatData.lastMessage,
          timestamp: chatData.timestamp
        };
      });
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

module.exports = router;
