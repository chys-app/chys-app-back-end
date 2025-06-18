const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  uploadStory,
  getPublicStories,
  getSingleStory,
  editStory,
  deleteStory
} = require('../controllers/storyController');
const auth = require('../middleware/auth');


router.post('/', auth, upload.single('media'), uploadStory);
router.get('/public', auth, getPublicStories);
router.get('/:id?', auth, getSingleStory);
router.put('/:id', auth, editStory);
router.delete('/:id', auth, deleteStory);

module.exports = router;
