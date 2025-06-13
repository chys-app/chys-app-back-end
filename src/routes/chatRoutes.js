const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middlewares/auth');

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

module.exports = router;
