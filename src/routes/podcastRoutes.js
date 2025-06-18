// routes/podcastRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const podcastController = require('../controllers/podcastController');

router.post('/', auth, podcastController.createPodcast);
router.get('/:id/token', auth, podcastController.getPodcastToken);
router.get('/', auth, podcastController.getUserPodcasts)
router.put('/:id', auth, podcastController.editPodcast);

module.exports = router;
