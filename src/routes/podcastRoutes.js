// routes/podcastRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const podcastController = require('../controllers/podcastController');
const { upload } = require('../config/cloudinary');


router.post('/', auth, upload.single('bannerImage') , podcastController.createPodcast);
router.get('/:id/token', auth, podcastController.getPodcastToken);
router.post('/:id/end', auth, podcastController.endPodcast);
router.get('/', auth, podcastController.getUserPodcasts)
router.put('/:id', auth, podcastController.editPodcast);

module.exports = router;
