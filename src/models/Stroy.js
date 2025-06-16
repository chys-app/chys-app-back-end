const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'PetProfile', default: null },
  mediaUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  tags: [String],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  views: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'wow', 'funny'] },
    reactedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);
module.exports = Story; 
