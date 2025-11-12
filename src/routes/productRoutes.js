const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getPublicProducts, getProductById, updateProduct, deleteProduct, addToWishlist, removeFromWishlist, getWishlist } = require('../controllers/productController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.post('/products', auth, upload.array('media', 5), createProduct);
router.get('/products', auth, getProducts); // User's own products or by user id
router.get('/products/public', getPublicProducts); // All products (public)
router.get('/products/:productId', auth, getProductById);
router.put('/products/:productId', auth, upload.array('media', 5), updateProduct);
router.delete('/products/:productId', auth, deleteProduct);

// Wishlist routes
router.post('/wishlist/:productId', auth, addToWishlist);
router.delete('/wishlist/:productId', auth, removeFromWishlist);
router.get('/wishlist/:userId?', auth, getWishlist);

module.exports = router;
