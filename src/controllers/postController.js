const Post = require('../models/Post');

// Create a new post
const createPost = async (req, res) => {
    try {
      const { description, media, tags, location } = req.body;
  
      const post = new Post({
        description,
        media,
        creator: req.user._id,
        ...(tags && { tags }),         // Only include if tags are provided
        ...(location && { location })  // Only include if location is provided
      });
  
      await post.save();
      await post.populate('creator', 'username profilePicture');
  
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  

// Get all posts with pagination and filtering
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { isActive: true };
    
    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(',') };
    }
    if (req.query.location) {
      query.location = req.query.location;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('creator', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.viewCount += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'media', 'tags', 'location'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const post = await Post.findOne({ _id: req.params.id, creator: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    updates.forEach(update => post[update] = req.body[update]);
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a post (soft delete)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, creator: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    post.isActive = false;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like/Unlike a post
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.user._id);
    
    if (likeIndex === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a comment to a post
const addComment = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Comment message is required' });
    }

    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      message
    });

    await post.save();
    await post.populate('comments.user', 'username profilePicture');
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's posts
const getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ 
      creator: req.params.userId,
      isActive: true 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      .lean();

    const total = await Post.countDocuments({ 
      creator: req.params.userId,
      isActive: true 
    });

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getUserPosts
}; 