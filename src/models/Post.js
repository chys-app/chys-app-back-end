const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new Schema({
  description: { type: String, required: true },
  media: [{ type: String, required: true }], // image/video URLs
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  viewCount: { type: Number, default: 0 },
  viewedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  location: { type: String }, 
  isActive: { type: Boolean, default: true },
  funds: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
}, {
  timestamps: true 
});

module.exports = mongoose.model('Post', PostSchema);
