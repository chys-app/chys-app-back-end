const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const connectedUsers = new Map(); // userId => socket.id

const chatHandler = (io) => {
  // Authenticate socket connection using JWT
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

      socket.user = user; // Attach user to socket for later use
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  // Handle connection
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`✅ User ${userId} connected via socket ${socket.id}`);
    connectedUsers.set(userId, socket.id);

    // 🔹 Handle private message
    socket.on('private_message', async ({ receiverId, message }) => {
      try {
        const newMessage = await Message.create({
          senderId: userId,
          receiverId,
          message
        });

        const messagePayload = {
          senderId: userId,
          receiverId,
          message,
          timestamp: newMessage.timestamp
        };

        // Emit to sender (confirmation)
        socket.emit('receive_message', messagePayload);

        // Emit to receiver if online
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', messagePayload);
        }
      } catch (error) {
        console.error('❌ Error saving or sending message:', error.message);
        socket.emit('error_message', {
          message: 'Failed to send message',
          error: error.message
        });
      }
    });


    // 🔹 Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🚫 User ${userId} disconnected`);
      connectedUsers.delete(userId);
    });
  });
};

module.exports = chatHandler;
