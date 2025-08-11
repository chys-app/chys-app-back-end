const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get messages between the authenticated user and another user
router.get('/:receiverId', auth, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const currentUserId = req.user._id;

    // Check if users are blocked from each other
    const currentUser = await User.findById(currentUserId).select('blockedUsers').lean();
    const receiverUser = await User.findById(receiverId).select('blockedUsers').lean();

    if (!receiverUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is blocked by receiver or has blocked receiver
    if (currentUser.blockedUsers.includes(receiverId) || receiverUser.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({ 
        message: 'Cannot chat with blocked user',
        blocked: true
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId },
        { senderId: receiverId, receiverId: currentUserId }
      ]
    })
    .populate('senderId', '_id name profilePic')
    .populate('receiverId', '_id name profilePic')
    .sort({ timestamp: 1 });

    // Format response to include user details and media
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      sender: {
        _id: msg.senderId._id,
        name: msg.senderId.name,
        profilePic: msg.senderId.profilePic
      },
      receiver: {
        _id: msg.receiverId._id,
        name: msg.receiverId.name,
        profilePic: msg.receiverId.profilePic
      },
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

    // Get current user's blocked users and users who blocked them
    const currentUser = await User.findById(userId).select('blockedUsers').lean();
    const blockedUserIds = currentUser?.blockedUsers || [];
    
    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id').lean();
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id);
    
    // Combine all blocked user IDs
    const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];

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

      // Skip blocked users
      if (allBlockedIds.some(id => id.toString() === otherUserId)) {
        return;
      }

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

    // Fetch user details (excluding blocked users)
    const users = await User.find({ 
      _id: { $in: userIds },
      _id: { $nin: allBlockedIds }
    }).select('_id name email profilePic');

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

