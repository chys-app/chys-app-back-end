const mongoose = require('mongoose');

const petProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isHavePet: {
    type: Boolean,
    default: false
  },
  petType: {
    type: String,
    required: true
  },
  profilePic: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  breed: {
    type: String,
    required: true,
    trim: true
  },
  race: {
    type: String,
    trim: true
  },
  ownerContactNumber: {
    type: String,
    trim: true
  },
  address: {
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: {type: String, trim: true}
  },
  sex: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  bio: {
    type: String,
    trim: true
  },
  photos: {
    type: [String],
    validate: [val => val.length <= 5, 'Maximum of 5 photos allowed']
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  marks: {
    type: String,
    trim: true
  },
  microchipNumber: {
    type: String,
    trim: true
  },
  tagId: {
    type: String,
    trim: true
  },
  lostStatus: {
    type: Boolean,
    default: false
  },
  vaccinationStatus: {
    type: Boolean,
    default: false
  },
  vetName: {
    type: String,
    trim: true
  },
  vetContactNumber: {
    type: String,
    trim: true
  },
  personalityTraits: [{
    type: String,
    trim: true
  }],
  allergies: [{
    type: String,
    trim: true
  }],
  specialNeeds: {
    type: String,
    trim: true
  },
  feedingInstructions: {
    type: String,
    trim: true
  },
  dailyRoutine: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

petProfileSchema.index({ user: 1 });

module.exports = mongoose.model('PetProfile', petProfileSchema); 