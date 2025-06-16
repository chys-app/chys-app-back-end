const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const http = require('http');
const { Server } = require('socket.io');
const userRoutes = require('./routes/userRoutes');
const petProfileRoutes = require('./routes/petProfileRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const storyRoutes = require('./routes/storyRoutes')
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./config/logger');
const chatHandler = require('./sockets/chatHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Apply Socket.IO handler
chatHandler(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/pet-profile', petProfileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/story', storyRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pet App API' });
});

// Webhook (e.g., GitHub auto-deploy)
app.post('/webhook', (req, res) => {
  logger.info('Webhook received from GitHub');
  exec('setsid bash ~/deploy.sh > ~/deploy.log 2>&1 &');
  res.send('Deployment triggered');
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Error occurred:', { error: err.message, stack: err.stack });
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

startServer();
