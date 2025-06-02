const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const userRoutes = require('./routes/userRoutes');
const petProfileRoutes = require('./routes/petProfileRoutes');
const { connectDB } = require('./config/database');

dotenv.config();

const app = express();
//coming from the frontend
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/users', userRoutes);
app.use('/api/pet-profile', petProfileRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pet App API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
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