const Product = require('../models/Product');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

const createProduct = async (req, res) => {
  try {
    const { type, name, description, url, price, discount } = req.body;

    console.log("createProduct is called");

    const uploadedMedia = Array.isArray(req.files)
      ? req.files.map((file) => file.path)
      : [];

    if (uploadedMedia.length === 0) {
      return res.status(400).json({ message: 'At least one media file is required' });
    }

    const product = await Product.create({
      type: type?.toLowerCase(),
      name: name?.trim(),
      description: description?.trim() || '',
      url: url?.trim(),
      price,
      discount: discount || 0,
      media: uploadedMedia,
      owner: req.user._id,
      ownerName: req.user.name
    });

    // Populate owner info for response
    await product.populate('owner', 'name profilePic email');

    res.status(201).json(product);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded files:', cleanupError);
        }
      }
    }
    console.error('Error creating product:', error);
    res.status(400).json({ 
      message: error.message,
      errors: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : undefined
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user._id;
    
    const products = await Product.find({ owner: targetUserId })
      .populate('owner', 'name profilePic email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      owner: req.user._id
    })
    .populate('owner', 'name profilePic email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      owner: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.files && req.files.length > 0) {
      for (const mediaUrl of product.media) {
        try {
          const publicId = mediaUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (cleanupError) {
          console.error('Error deleting old media:', cleanupError);
        }
      }

      product.media = req.files.map((file) => file.path);
    }

    const { type, name, description, url, price, discount } = req.body;

    if (type) {
      product.type = type.toLowerCase();
    }

    if (name !== undefined) {
      product.name = name.trim();
    }

    if (description !== undefined) {
      product.description = description.trim();
    }

    if (url !== undefined) {
      product.url = url.trim();
    }

    if (price !== undefined) {
      product.price = price;
    }

    if (discount !== undefined) {
      product.discount = discount;
    }

    await product.save();

    res.json(product);
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded files:', cleanupError);
        }
      }
    }
    res.status(400).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.productId,
      owner: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getPublicProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('owner', 'name profilePic email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add to user's wishlist if not already there
    const user = await User.findById(userId);
    if (!user.wishList.includes(productId)) {
      user.wishList.push(productId);
      await user.save();
    }

    res.json({ message: 'Product added to wishlist', wishList: user.wishList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Remove from user's wishlist
    const user = await User.findById(userId);
    const wishlistIndex = user.wishList.indexOf(productId);
    
    if (wishlistIndex === -1) {
      return res.status(400).json({ message: 'Product not in wishlist' });
    }

    user.wishList.splice(wishlistIndex, 1);
    await user.save();

    res.json({ message: 'Product removed from wishlist', wishList: user.wishList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    const user = await User.findById(userId).populate({
      path: 'wishList',
      populate: {
        path: 'owner',
        select: 'name profilePic'
      }
    });

    res.json(user.wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getPublicProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
