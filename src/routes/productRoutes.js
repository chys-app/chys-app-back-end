const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getPublicProducts } = require('../controllers/productController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/public', getPublicProducts);

// Protected routes (require authentication)
router.post('/', auth, upload.array('media', 5), createProduct);
router.get('/', auth, getProducts);
router.get('/:productId', auth, getProductById);
router.put('/:productId', auth, upload.array('media', 5), updateProduct);
router.delete('/:productId', auth, deleteProduct);

module.exports = router;
