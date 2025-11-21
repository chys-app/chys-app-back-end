const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ownerName: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['product', 'service'],
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  media: [{ type: String, required: true }],
  url: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  viewCount: { type: Number, default: 0 },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  salesCount: { type: Number, default: 0 },
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
