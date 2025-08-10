const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const User = require('../models/User');

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

    // Format response to always include media
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      message: msg.message,
      media: msg.media || null,
      timestamp: msg.timestamp
    }));

    res.json(formattedMessages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/get/users', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages where the user is either sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    const chatMap = new Map();

    // Get the latest message per conversation (based on timestamp)
    messages.forEach(msg => {
      const otherUserId = msg.senderId.toString() === userId.toString()
        ? msg.receiverId.toString()
        : msg.senderId.toString();

      if (
        !chatMap.has(otherUserId) ||
        msg.timestamp > chatMap.get(otherUserId).timestamp
      ) {
        chatMap.set(otherUserId, {
          lastMessage: msg.message,
          media: msg.media || null,
          timestamp: msg.timestamp
        });
      }
    });

    const userIds = Array.from(chatMap.keys());

    // Fetch user details
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email profilePic');

    // Merge user and message info
    const result = users.map(user => {
      const chatData = chatMap.get(user._id.toString());
      return {
        user,
        lastMessage: chatData.lastMessage,
        media: chatData.media,
        timestamp: chatData.timestamp
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


const { upload } = require('../config/cloudinary');

router.post('/upload-media', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { path, filename, mimetype } = req.file;

  return res.status(200).json({
    url: path,
    public_id: filename,
    type: mimetype.startsWith('image/') ? 'image' : 'video',
  });
});

module.exports = router;
module.exports = router;
