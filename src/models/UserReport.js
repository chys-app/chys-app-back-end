const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  evidence: [{
    type: String, // URLs to evidence files/images
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reports from the same user
userReportSchema.index({ reporter: 1, reportedUser: 1 }, { unique: true });

module.exports = mongoose.model('UserReport', userReportSchema);
