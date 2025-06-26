const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  paidAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);