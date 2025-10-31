// routes/podcastRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const podcastController = require('../controllers/podcastController');
const { upload } = require('../config/cloudinary');
const uploadFields = upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'proofImages', maxCount: 5 },
  ]);

router.post(
    '/',
    auth,
    uploadFields,
    podcastController.createPodcast
  );

router.get('/following', auth, podcastController.getFollowingPodcasts);
router.get('/:id/token', auth, podcastController.getPodcastToken);
router.post('/:id/end', auth, podcastController.endPodcast);
router.get('/', auth, podcastController.getUserPodcasts);
router.put('/:id', auth, podcastController.editPodcast);

module.exports = router;
