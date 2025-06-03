const { upload } = require('../config/cloudinary');
const multer = require('multer');

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File size too large. Maximum size is 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum is 5 files'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Invalid field name for file upload'
      });
    }
    return res.status(400).json({
      message: err.message
    });
  }
  
  if (err.message === 'Invalid file type. Only images and videos are allowed.') {
    return res.status(400).json({
      message: err.message
    });
  }

  next(err);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError
}; 