const Story = require('../models/Stroy');
const asyncHandler = require('express-async-handler');

// @desc    Upload a new story
// @route   POST /api/stories
// @access  Private
const uploadStory = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ success: false, message: 'Media file is required' });
  }

  const { caption, petId } = req.body;

  const newStory = new Story({
    userId: req.user._id,
    petId: petId || null,
    mediaUrl: req.file.path,
    caption,
  });

  await newStory.save();

  res.status(201).json({ success: true, story: newStory });
});

// @desc    Get all active public stories (except own)
// @route   GET /api/stories/public
// @access  Private
const getPublicStories = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get current user's blocked users and users who blocked them
  const User = require('../models/User');
  const currentUser = await User.findById(userId).select('blockedUsers').lean();
  const blockedUserIds = currentUser?.blockedUsers || [];
  
  // Find users who have blocked the current user
  const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id').lean();
  const blockedByUserIds = usersWhoBlockedMe.map(user => user._id);
  
  // Combine all blocked user IDs
  const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];

  const stories = await Story.find({
    userId: { 
      $ne: userId,
      $nin: allBlockedIds
    },
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: 1 })
    .populate('userId petId', 'name image');

  // Group stories by userId
  const grouped = {};

  for (const story of stories) {
    if (!story.userId) continue; // Skip if userId is null
    const uid = story.userId._id.toString();

    if (!grouped[uid]) {
      grouped[uid] = {
        user: story.userId,
        pet: story.petId || null,
        stories: []
      };
    }

    const isView = story.views?.some(viewerId => viewerId.toString() === userId.toString());

    grouped[uid].stories.push({
      _id: story._id,
      mediaUrl: story.mediaUrl,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isView,
      viewCount: story.views ? story.views.length : 0
    });
  }

  const response = Object.values(grouped);
  res.json({ success: true, data: response });
});


const getSingleStory = asyncHandler(async (req, res) => {
    const storyId = req.params.id;
  
    // Get your own stories
    if (!storyId) {
      const ownStories = await Story.find({
        userId: req.user._id
      })
        .sort({ createdAt: 1 })
        .populate('userId petId', 'name image')
        .populate('views.userId', 'name');
  
      const response = ownStories.map(story => ({
        ...story.toObject(),
        viewCount: story.views.length,
        viewedBy: story.views.map(v => v.userId?.name)
      }));
  
      return res.json({ success: true, stories: response });
    }
  
    // If a story ID is provided → find the story
    const referenceStory = await Story.findById(storyId);
    if (!referenceStory || referenceStory.expiresAt < new Date()) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }
  
    const userId = referenceStory.userId.toString();
    const isOwner = userId === req.user._id.toString();
  
    // Fetch all active stories from that user
    const userStories = await Story.find({
      userId,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: 1 })
      .populate('userId petId', 'name image')
      .populate('views.userId', 'name');
  
    const updatedStories = await Promise.all(userStories.map(async (story) => {
      if (!isOwner) {
        const alreadyViewed = story.views.some(v => v.userId.toString() === req.user._id.toString());
        if (!alreadyViewed) {
          story.views.push({ userId: req.user._id });
          await story.save();
        }
      }
  
      return {
        ...story.toObject(),
        viewCount: story.views.length,
        ...(isOwner && {
          viewedBy: story.views.map(v => v.userId?.name)
        })
      };
    }));
  
    res.json({ success: true, stories: updatedStories });
  });
  

// @desc    Edit own story
// @route   PUT /api/stories/:id
// @access  Private
const editStory = asyncHandler(async (req, res) => {
  const story = await Story.findOne({ _id: req.params.id, userId: req.user._id });

  if (!story) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  const { caption } = req.body;

  if (caption !== undefined) story.caption = caption;

  await story.save();

  res.json({ success: true, story });
});

// @desc    Delete own story
// @route   DELETE /api/stories/:id
// @access  Private
const deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!story) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  res.json({ success: true, message: 'Story deleted successfully' });
});

// @desc    Update story view count
// @route   POST /api/stories/:id/view
// @access  Private
const updateStoryView = asyncHandler(async (req, res) => {
  const storyId = req.params.id;
  const userId = req.user._id;

  // Find the story
  const story = await Story.findById(storyId);
  
  if (!story) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  // Check if story has expired
  if (story.expiresAt < new Date()) {
    return res.status(404).json({ success: false, message: 'Story has expired' });
  }

  // Check if user is the owner of the story
  if (story.userId.toString() === userId.toString()) {
    return res.status(400).json({ success: false, message: 'Cannot view your own story' });
  }

  // Check if user has already viewed this story
  const alreadyViewed = story.views.some(view => view.userId.toString() === userId.toString());
  
  if (alreadyViewed) {
    return res.json({ 
      success: true, 
      message: 'Story already viewed',
      viewsCount: story.views.length,
      alreadyViewed: true
    });
  }

  // Add view to the story
  story.views.push({ userId: userId });
  await story.save();

  res.json({ 
    success: true, 
    message: 'Story view updated successfully',
    viewsCount: story.views.length,
    alreadyViewed: false
  });
});

module.exports = {
  uploadStory,
  getPublicStories,
  getSingleStory,
  editStory,
  deleteStory,
  updateStoryView
};
