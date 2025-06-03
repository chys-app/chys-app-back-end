const Post = require('../models/Post');
const { cloudinary } = require('../config/cloudinary');

// Create a new post
const createPost = async (req, res) => {
  try {
    const { description, tags, location } = req.body;
    
    // Handle media uploads
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        media.push(file.path);
      });
    }

    if (media.length === 0) {
      return res.status(400).json({ message: 'At least one media file is required' });
    }

    // Parse tags if they exist and are in string format
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }

    const post = new Post({
      description: description.trim(),
      media,
      creator: req.user._id,
      ...(parsedTags.length > 0 && { tags: parsedTags }),
      ...(location && { location: location.trim() })
    });

    await post.save();
    
    // Populate all necessary fields
    await post.populate([
      { path: 'creator', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      { path: 'comments.user', select: 'username profilePicture' }
    ]);

    res.status(201).json(post);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const publicId = file.path.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }
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
      .populate([
        { path: 'creator', select: 'username profilePicture' },
        { path: 'likes', select: 'username profilePicture' },
        { path: 'comments.user', select: 'username profilePicture' }
      ])
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
      .populate([
        { path: 'creator', select: 'username profilePicture' },
        { path: 'likes', select: 'username profilePicture' },
        { path: 'comments.user', select: 'username profilePicture' }
      ]);

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
    const allowedUpdates = ['description', 'tags', 'location'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const post = await Post.findOne({ _id: req.params.id, creator: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    // Handle media updates if new files are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old media files from Cloudinary
      for (const mediaUrl of post.media) {
        try {
          const publicId = mediaUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Error deleting old media:', error);
        }
      }

      // Add new media files
      post.media = req.files.map(file => file.path);
    }

    // Update other fields
    updates.forEach(update => {
      if (update === 'tags') {
        try {
          post[update] = typeof req.body[update] === 'string' 
            ? JSON.parse(req.body[update]) 
            : req.body[update];
        } catch (error) {
          post[update] = req.body[update].split(',').map(tag => tag.trim());
        }
      } else {
        post[update] = req.body[update].trim();
      }
    });

    await post.save();
    
    // Populate all necessary fields
    await post.populate([
      { path: 'creator', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      { path: 'comments.user', select: 'username profilePicture' }
    ]);

    res.json(post);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Error cleaning up uploaded files:', error);
        }
      }
    }
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
    
    // Populate all necessary fields
    await post.populate([
      { path: 'creator', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      { path: 'comments.user', select: 'username profilePicture' }
    ]);

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
    
    // Populate all necessary fields
    await post.populate([
      { path: 'creator', select: 'username profilePicture' },
      { path: 'likes', select: 'username profilePicture' },
      { path: 'comments.user', select: 'username profilePicture' }
    ]);
    
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
      .populate([
        { path: 'creator', select: 'username profilePicture' },
        { path: 'likes', select: 'username profilePicture' },
        { path: 'comments.user', select: 'username profilePicture' }
      ])
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