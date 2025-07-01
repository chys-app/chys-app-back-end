const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationUtil');


const connectedUsers = new Map();

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

      socket.user = user;
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

    socket.on('private_message', async ({ receiverId, message, media }) => {
      try {
        const newMessage = await Message.create({
          senderId: userId,
          receiverId,
          message,
          media
        });
    
        const messagePayload = {
          _id: newMessage._id,
          senderId: userId,
          receiverId,
          message: newMessage.message,
          media: newMessage.media,
          timestamp: newMessage.timestamp
        };
    
        socket.emit('receive_message', messagePayload);
    
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', messagePayload);
        }
    
        if (receiverId !== userId) {
          await sendNotification({
            userIds: receiverId,
            title: 'New Message 📩',
            message: media ? `${socket.user.name} sent a media file.` : `${socket.user.name} sent you a message.`,
            type: 'MESSAGE',
            data: {
              senderId: userId,
              messageId: newMessage._id.toString()
            }
          });
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
