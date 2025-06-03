const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const petProfileRoutes = require('./routes/petProfileRoutes');
const postRoutes = require('./routes/postRoutes');
const { connectDB } = require('./config/database');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Increase payload size limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/pet-profile', petProfileRoutes);
app.use('/api/posts', postRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pet App API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    await connectDB();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

startServer(); 