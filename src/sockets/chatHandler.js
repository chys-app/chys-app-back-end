const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const connectedUsers = new Map(); // userId => socket.id

const chatHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user; // attach the user for later use
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User ${userId} connected via socket ${socket.id}`);
    connectedUsers.set(userId, socket.id);

    // Handle sending a private message
    socket.on('private_message', async ({ receiverId, message }) => {
      try {
        const newMessage = await Message.create({
          senderId: userId,
          receiverId,
          message
        });

        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('private_message', {
            senderId: userId,
            message,
            timestamp: newMessage.timestamp
          });
        }
      } catch (error) {
        console.error('Error saving message:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      connectedUsers.delete(userId);
    });
  });
};

module.exports = chatHandler;
