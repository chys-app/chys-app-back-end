const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pet-app', // The name of the folder in cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', "webp"], // Allowed file formats
    resource_type: 'auto', // Automatically detect resource type
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optional: limit image size
  }
});

// Create multer upload instance with error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 6 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
  }
});

module.exports = {
  cloudinary,
  upload
}; 