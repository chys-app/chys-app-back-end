const express = require('express');
const router = express.Router();
const { createPetProfile, getPetProfile, updatePetProfile, deletePetProfile } = require('../controllers/petProfileController');
const auth = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/fileUpload');

router.use(auth);

router.post('/', uploadMultiple('images', 5), handleUploadError, createPetProfile);

router.get('/', getPetProfile);

router.put('/', uploadMultiple('images', 5), handleUploadError, updatePetProfile);

router.delete('/', deletePetProfile);

module.exports = router; 