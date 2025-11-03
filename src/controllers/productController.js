const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

const createProduct = async (req, res) => {
  try {
    const { type, name, description, url, price } = req.body;

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
      media: uploadedMedia,
      owner: req.user._id,
      ownerName: req.user.name
    });

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
    const products = await Product.find({ owner: req.user._id }).sort({ createdAt: -1 });
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
    });

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

    const { type, name, description, url, price } = req.body;

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
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getPublicProducts
};
