const Post = require("../models/Post");
const Podcast = require("../models/Podcast");
const { cloudinary } = require("../config/cloudinary");
const { sendNotification } = require("../utils/notificationUtil");
const User = require("../models/User");
const PetProfile = require("../models/PetProfile");

// Helper function to populate pet information for posts
const populatePetInfo = async (posts) => {
  const enrichedPosts = [];
  
  for (const post of posts) {
    // Get the user's pet profile
    const petProfile = await PetProfile.findOne({ user: post.creator._id }).lean();
    
    // Create enriched post with pet info
    const enrichedPost = {
      ...post,
      creator: {
        ...post.creator,
        name: petProfile ? petProfile.name : post.creator.name,
        profilePic: petProfile ? petProfile.profilePic : post.creator.profilePic,
        petInfo: petProfile ? {
          petType: petProfile.petType,
          breed: petProfile.breed,
          race: petProfile.race
        } : null
      }
    };
    
    enrichedPosts.push(enrichedPost);
  }
  
  return enrichedPosts;
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { description, tags, location } = req.body;

    // Handle media uploads
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        media.push(file.path);
      });
    }

    if (media.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one media file is required" });
    }

    // Parse tags if they exist and are in string format
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
      } catch (error) {
        parsedTags = tags.split(",").map((tag) => tag.trim());
      }
    }

    const post = new Post({
      description: description.trim(),
      media,
      creator: req.user._id,
      ...(parsedTags.length > 0 && { tags: parsedTags }),
      ...(location && { location: location.trim() }),
    });

    await post.save();

    // Populate all necessary fields
    await post.populate([
      { path: "creator", select: "name profilePic" },
      { path: "likes", select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo([post]);
    res.status(201).json(enrichedPosts[0]);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const publicId = file.path.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }
    res.status(400).json({ message: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current user's blocked users and users who blocked them
    const currentUser = await User.findById(userId).select('blockedUsers').lean();
    const blockedUserIds = currentUser?.blockedUsers || [];
    
    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id').lean();
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id);
    
    // Combine all blocked user IDs
    const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];

    const query = { isActive: true };

    // Filter by tags
    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(",") };
    }

    // Filter by location
    if (req.query.location) {
      query.location = req.query.location;
    }

    // ✅ Filter by following users
    if (req.query.followingOnly === 'true') {
      const currentUserWithFollowing = await User.findById(userId).select('following').lean();

      if (!currentUserWithFollowing || !currentUserWithFollowing.following?.length) {
        return res.json({
          posts: [],
          currentPage: page,
          totalPages: 0,
          totalPosts: 0
        });
      }

      // Filter out blocked users from following
      const validFollowingIds = currentUserWithFollowing.following.filter(
        id => !allBlockedIds.includes(id.toString())
      );
      
      if (!validFollowingIds.length) {
        return res.json({
          posts: [],
          currentPage: page,
          totalPages: 0,
          totalPosts: 0
        });
      }

      query.creator = { $in: validFollowingIds };
    }

    // Exclude posts from blocked users
    if (allBlockedIds.length > 0) {
      query.creator = { ...query.creator, $nin: allBlockedIds };
    }

    // Exclude posts that the current user has reported
    query.reports = { $not: { $elemMatch: { user: userId } } };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "creator", select: "name bio profilePic" },
        { path: "likes", select: "_id" },
        { path: "comments.user", select: "_id name profilePic" },
      ])
      .lean();

    const total = await Post.countDocuments(query);

    // Get user's favorites
    const user = await User.findById(userId).select("favorites").lean();
    const favoritePostIds = user?.favorites?.map(fav => fav.toString()) || [];

    // First enrich with pet information
    const postsWithPetInfo = await populatePetInfo(posts);

    const enrichedPosts = postsWithPetInfo.map(post => {
      const postIdStr = post._id.toString();

      const isLike = Array.isArray(post.likes) && post.likes.some(
        likeUser => likeUser && likeUser._id && userId && likeUser._id.toString() === userId.toString()
      );
      const isComment = Array.isArray(post.comments) && post.comments.some(
        comment => comment.user && comment.user._id && userId && comment.user._id.toString() === userId.toString()
      );
      const isFavorite = favoritePostIds.includes(postIdStr);
      const userFund = Array.isArray(post.funds) && post.funds.find(
        fund => fund.user && userId && fund.user.toString() === userId.toString()
      );
      const isFunded = !!userFund;
      const fundedAmount = userFund?.amount || 0;
      const fundCount = Array.isArray(post.funds) ? post.funds.length : 0;
      const isViewed = Array.isArray(post.viewedBy) && post.viewedBy.some(viewer => viewer && userId && viewer.toString() === userId.toString());

      return {
        ...post,
        isLike,
        isComment,
        isFavorite,
        isFunded,
        fundedAmount,
        fundCount,
        isViewed
      };
    });

    res.json({
      posts: enrichedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: error.message });
  }
};



const recordView = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyViewed = post.viewedBy.some(
      viewerId => viewerId.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      post.viewedBy.push(userId);
      post.viewCount += 1;
      await post.save();
    }

    res.json({
      success: true,
      message: alreadyViewed ? 'Already viewed' : 'View recorded',
      postId,
      viewCount: post.viewCount,
      alreadyViewed,
    });
  } catch (err) {
    console.error('Error recording view:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// Get a single post by ID
const getPostById = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    const post = await Post.findById(req.params.id).populate([
      { path: "creator", select: "name profilePic" },
      { path: "likes", select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if current user has reported this post
    const isReported = post.reports.some(
      report => report.user.toString() === currentUserId.toString()
    );

    if (isReported) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.viewCount += 1;
    await post.save();

    // ✅ Check if current user liked the post
    const isCurrentUserLiked = post.likes.some(user => user._id.toString() === currentUserId.toString());

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo([post.toObject()]);
    const enrichedPost = enrichedPosts[0];

    // ✅ Send post object + isCurrentUserLiked
    res.json({
      ...enrichedPost,
      isCurrentUserLiked,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update a post
const updatePost = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["description", "tags", "location"];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return res.status(400).json({ message: "Invalid updates" });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      creator: req.user._id,
    });

    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found or unauthorized" });
    }

    // Handle media updates if new files are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old media files from Cloudinary
      for (const mediaUrl of post.media) {
        try {
          const publicId = mediaUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting old media:", error);
        }
      }

      // Add new media files
      post.media = req.files.map((file) => file.path);
    }

    // Update other fields
    updates.forEach((update) => {
      if (update === "tags") {
        try {
          post[update] =
            typeof req.body[update] === "string"
              ? JSON.parse(req.body[update])
              : req.body[update];
        } catch (error) {
          post[update] = req.body[update].split(",").map((tag) => tag.trim());
        }
      } else {
        post[update] = req.body[update].trim();
      }
    });

    await post.save();

    // Populate all necessary fields
    await post.populate([
      { path: "creator", select: "name profilePic" },
      { path: "likes", select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo([post]);
    res.json(enrichedPosts[0]);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.path.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error cleaning up uploaded files:", error);
        }
      }
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete a post (soft delete)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      creator: req.user._id,
    });

    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found or unauthorized" });
    }

    post.isActive = false;
    await post.save();

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like/Unlike a post
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("creator");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const likeIndex = post.likes.indexOf(req.user._id);
    let liked = false;

    if (likeIndex === -1) {
      post.likes.push(req.user._id);
      liked = true;
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    await post.populate([
      { path: "creator", select: "name profilePic" },
      { path: "likes", select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo([post]);
    const enrichedPost = enrichedPosts[0];

    // 🔔 Notify post creator
    if (liked && post.creator._id.toString() !== req.user._id.toString()) {
      await sendNotification({
        userIds: post.creator._id,
        title: "New Like ❤️",
        message: `${req.user.name} liked your post.`,
        type: "LIKE",
        data: {
          postId: post._id.toString(),
        },
        senderId: req.user._id
      });
    }

    res.json(enrichedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const post = await Post.findById(req.params.id).populate("creator");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: req.user._id,
      message,
    });

    await post.save();

    await post.populate([
      { path: "creator", select: "name profilePic" },
      { path: "likes", select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo([post]);
    const enrichedPost = enrichedPosts[0];

    // 🔔 Notify post creator
    if (post.creator._id.toString() !== req.user._id.toString()) {
      await sendNotification({
        userIds: post.creator._id,
        title: "New Comment 💬",
        message: `${req.user.name} commented on your post: "${message}"`,
        type: "COMMENT",
        data: {
          postId: post._id.toString(),
        },
        senderId: req.user._id
      });
    }

    res.json(enrichedPost);
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
    const currentUserId = req.user?._id;
    const targetUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if users are blocked from each other
    const currentUser = await User.findById(currentUserId).select('blockedUsers').lean();
    const targetUser = await User.findById(targetUserId).select('blockedUsers').lean();

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is blocked by target user or has blocked target user
    if (currentUser.blockedUsers.includes(targetUserId) || targetUser.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({ 
        message: 'Cannot view posts from blocked user',
        blocked: true
      });
    }

    const posts = await Post.find({
      creator: req.params.userId,
      isActive: true,
      reports: { $not: { $elemMatch: { user: currentUserId } } }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "creator", select: "name profilePic bio" },
        { path: "likes", select: "name profilePic" },
        { path: "comments.user", select: "name profilePic" },
      ])
      .lean();

    const total = await Post.countDocuments({
      creator: req.params.userId,
      isActive: true,
      reports: { $not: { $elemMatch: { user: currentUserId } } }
    });

    // Enrich with pet information
    const enrichedPosts = await populatePetInfo(posts);

    res.json({
      posts: enrichedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const fundItem = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { type, id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    let Model, creatorField;

    if (type === "post") {
      Model = Post;
      creatorField = "creator";
    } else if (type === "podcast") {
      Model = Podcast;
      creatorField = "host";
    } else {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be 'post' or 'podcast'." });
    }

    const item = await Model.findById(id).populate(creatorField);
    if (!item) {
      return res.status(404).json({ message: `${type} not found.` });
    }

    item.funds.push({
      user: userId,
      amount,
    });

    await item.save();

    await User.findByIdAndUpdate(item[creatorField]._id, {
      $inc: { totalFundReceived: amount },
    });

    return res
      .status(200)
      .json({ message: `Fund sent successfully to the ${type}.` });
  } catch (err) {
    console.error("Error funding item:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

const getAllFunds = async (req, res) => {
  try {
    const { type, id } = req.params;

    let Model;
    if (type === "post") {
      Model = Post;
    } else if (type === "podcast") {
      Model = Podcast;
    } else {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be 'post' or 'podcast'." });
    }

    const item = await Model.findById(id)
      .populate({
        path: "funds.user",
        select: "name email profileImage",
      })
      .select("funds targetAmount"); // this will just be ignored for Post

    if (!item) {
      return res.status(404).json({ message: `${type} not found.` });
    }

    const totalAmount = item.funds.reduce((sum, fund) => sum + fund.amount, 0);

    res.status(200).json({
      targetAmount: type === "podcast" ? item.targetAmount : null, // ✅ handle missing field
      totalAmount,
      funds: item.funds,
    });
  } catch (error) {
    console.error("Error getting funds:", error);
    res.status(500).json({ message: "Server error." });
  }
};


const getShareablePostLink = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }


    const shareLink = `https://www.chys.app/post/${post._id}`;

    res.json({ shareLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Report a post
const reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Report reason is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user has already reported this post
    const alreadyReported = post.reports.some(
      report => report.user.toString() === userId.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: "You have already reported this post" });
    }

    // Add the report
    post.reports.push({
      user: userId,
      reason: reason.trim()
    });

    await post.save();

    res.json({ 
      message: "Post reported successfully",
      reportCount: post.reports.length
    });
  } catch (error) {
    console.error("Error reporting post:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get posts from users that current user is following
const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current user with following list
    const currentUser = await User.findById(userId).select('following blockedUsers').lean();
    
    if (!currentUser || !currentUser.following?.length) {
      return res.json({
        posts: [],
        currentPage: page,
        totalPages: 0,
        totalPosts: 0
      });
    }

    // Get blocked user IDs
    const blockedUserIds = currentUser?.blockedUsers || [];
    
    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id').lean();
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id);
    
    // Combine all blocked user IDs
    const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];

    // Filter out blocked users from following
    const validFollowingIds = currentUser.following.filter(
      id => !allBlockedIds.some(blockedId => blockedId.toString() === id.toString())
    );
    
    if (!validFollowingIds.length) {
      return res.json({
        posts: [],
        currentPage: page,
        totalPages: 0,
        totalPosts: 0
      });
    }

    const query = {
      isActive: true,
      creator: { $in: validFollowingIds },
      reports: { $not: { $elemMatch: { user: userId } } }
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "creator", select: "name bio profilePic" },
        { path: "likes", select: "_id" },
        { path: "comments.user", select: "_id name profilePic" },
      ])
      .lean();

    const total = await Post.countDocuments(query);

    // Get user's favorites
    const user = await User.findById(userId).select("favorites").lean();
    const favoritePostIds = user?.favorites?.map(fav => fav.toString()) || [];

    // Enrich with pet information
    const postsWithPetInfo = await populatePetInfo(posts);

    const enrichedPosts = postsWithPetInfo.map(post => {
      const postIdStr = post._id.toString();

      const isLike = Array.isArray(post.likes) && post.likes.some(
        likeUser => likeUser && likeUser._id && userId && likeUser._id.toString() === userId.toString()
      );
      const isComment = Array.isArray(post.comments) && post.comments.some(
        comment => comment.user && comment.user._id && userId && comment.user._id.toString() === userId.toString()
      );
      const isFavorite = favoritePostIds.includes(postIdStr);
      const userFund = Array.isArray(post.funds) && post.funds.find(
        fund => fund.user && userId && fund.user.toString() === userId.toString()
      );
      const isFunded = !!userFund;
      const fundedAmount = userFund?.amount || 0;
      const fundCount = Array.isArray(post.funds) ? post.funds.length : 0;
      const isViewed = Array.isArray(post.viewedBy) && post.viewedBy.some(viewer => viewer && userId && viewer.toString() === userId.toString());

      return {
        ...post,
        isLike,
        isComment,
        isFavorite,
        isFunded,
        fundedAmount,
        fundCount,
        isViewed
      };
    });

    res.json({
      posts: enrichedPosts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error("Error fetching following posts:", error);
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
  getUserPosts,
  fundItem,
  getAllFunds,
  recordView,
  getShareablePostLink,
  reportPost,
  getFollowingPosts
};
