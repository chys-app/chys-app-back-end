const express = require('express');
const router = express.Router();
const { createPetProfile, getPetProfile, updatePetProfile, deletePetProfile } = require('../controllers/petProfileController');
const auth = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/fileUpload');
const { upload } = require('../config/cloudinary');
const multer = require('multer');
const uploadFields = upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'photos', maxCount: 5 }
]);

router.use(auth);

router.post('/', uploadFields, handleUploadError, createPetProfile);

router.get('/', getPetProfile);

router.put('/', uploadMultiple('images', 5), handleUploadError, updatePetProfile);

router.delete('/', deletePetProfile);

module.exports = router; 