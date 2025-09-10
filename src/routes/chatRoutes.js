const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PetProfile = require('../models/PetProfile');

// Helper function to populate pet information for users
const populatePetInfoForUsers = async (users) => {
  const enrichedUsers = [];
  
  for (const user of users) {
    // Get the user's pet profile
    const petProfile = await PetProfile.findOne({ user: user._id }).lean();
    
    // Create enriched user with pet info
    const enrichedUser = {
      ...user,
      name: petProfile ? petProfile.name : user.name,
      profilePic: petProfile ? petProfile.profilePic : user.profilePic,
      petInfo: petProfile ? {
        petType: petProfile.petType,
        breed: petProfile.breed,
        race: petProfile.race
      } : null
    };
    
    enrichedUsers.push(enrichedUser);
  }
  
  return enrichedUsers;
};

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

    // Get unique user IDs from messages
    const userIds = [...new Set([
      ...messages.map(msg => msg.senderId._id.toString()),
      ...messages.map(msg => msg.receiverId._id.toString())
    ])];

    // Fetch user details and enrich with pet info
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name profilePic')
      .lean();
    
    const enrichedUsers = await populatePetInfoForUsers(users);
    
    // Create a map for quick lookup
    const userMap = new Map();
    enrichedUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Format response to include pet details and media
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      sender: userMap.get(msg.senderId._id.toString()) || {
        _id: msg.senderId._id,
        name: msg.senderId.name,
        profilePic: msg.senderId.profilePic
      },
      receiver: userMap.get(msg.receiverId._id.toString()) || {
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
    const userId = req.user._id.toString();

    // Get blocked users (both ways)
    const currentUser = await User.findById(userId).select('blockedUsers').lean();
    const blockedUserIds = currentUser?.blockedUsers.map(id => id.toString()) || [];

    const blockedByUsers = await User.find({ blockedUsers: userId })
      .select('_id')
      .lean();
    const blockedByUserIds = blockedByUsers.map(user => user._id.toString());

    const allBlockedIds = [...new Set([...blockedUserIds, ...blockedByUserIds])];

    // Get messages sorted by newest first
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ timestamp: -1 }).lean();

    const chatMap = new Map();

    // Loop once, since messages are sorted newest first
    for (const msg of messages) {
      const otherUserId = msg.senderId.toString() === userId
        ? msg.receiverId.toString()
        : msg.senderId.toString();

      // Skip blocked users
      if (allBlockedIds.includes(otherUserId)) continue;

      // Store only first (latest) message for each user
      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, {
          lastMessage: msg.message || '',
          media: msg.media || null,
          timestamp: msg.timestamp
        });
      }
    }

    const userIds = Array.from(chatMap.keys());

    // Fetch user details for chat partners
    const users = await User.find({
      _id: { $in: userIds, $nin: allBlockedIds }
    }).select('_id name email profilePic').lean();

    // Enrich users with pet information
    const enrichedUsers = await populatePetInfoForUsers(users);

    // Merge with message data
    const result = enrichedUsers.map(user => ({
      user,
      ...chatMap.get(user._id.toString())
    }));

    res.json(result);
  } catch (error) {
    console.error('Error in /get/users endpoint:', error);
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

