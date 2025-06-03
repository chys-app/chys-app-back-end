const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getUserPosts
} = require('../controllers/postController');

// Create a new post
router.post('/', auth, createPost);

// Get all posts with pagination and filtering
router.get('/', auth , getAllPosts);

// Get a single post by ID
router.get('/:id', auth ,getPostById);

// Update a post
router.patch('/:id', auth, updatePost);

// Delete a post (soft delete)
router.delete('/:id', auth, deletePost);

// Like/Unlike a post
router.post('/:id/like', auth, toggleLike);

// Add a comment to a post
router.post('/:id/comment', auth, addComment);

// Get user's posts
router.get('/user/:userId', getUserPosts);

module.exports = router; 