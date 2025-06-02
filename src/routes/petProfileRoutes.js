const express = require('express');
const router = express.Router();
const { createPetProfile, getPetProfile, updatePetProfile, deletePetProfile } = require('../controllers/petProfileController');
const auth = require('../middleware/auth');

router.post('/', auth, createPetProfile);
router.get('/', auth, getPetProfile);
router.patch('/', auth, updatePetProfile);
router.delete('/', auth, deletePetProfile);

module.exports = router; 