const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/fileUpload');
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getUserPosts,
  fundItem,
  getAllFunds
} = require('../controllers/postController');
const { toggleFavoritePost, getFavoritePosts } = require('../controllers/userController');


router.get('/getFavorite', auth, getFavoritePosts);
router.post('/favorite/:postId', auth, toggleFavoritePost);

// Create a new post
router.post('/fundRaise/:type/:id', auth, fundItem)
router.get('/fund/:type/:id', auth, getAllFunds);
router.post('/', auth, uploadMultiple('media', 5), handleUploadError, createPost);

router.get('/', auth, getAllPosts);

router.get('/:id', auth, getPostById);


router.patch('/:id', auth, uploadMultiple('media', 5), handleUploadError, updatePost);


router.delete('/:id', auth, deletePost);

router.post('/:id/like', auth, toggleLike);

router.post('/:id/comment', auth, addComment);

router.get('/user/:userId', getUserPosts);



module.exports = router; 