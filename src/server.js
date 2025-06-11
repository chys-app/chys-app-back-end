const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const userRoutes = require('./routes/userRoutes');
const petProfileRoutes = require('./routes/petProfileRoutes');
const postRoutes = require('./routes/postRoutes');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./config/logger');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/pet-profile', petProfileRoutes);
app.use('/api/posts', postRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pet App API' });
});

// ✅ GitHub Webhook Route
app.post('/webhook', (req, res) => {
  logger.info('Webhook received from GitHub');
  // Run deploy.sh in background so this process doesn't get killed
  exec('setsid bash ~/deploy.sh > ~/deploy.log 2>&1 &');
  res.send('Deployment triggered');
});

// Error handling middleware
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
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    await connectDB();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

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
