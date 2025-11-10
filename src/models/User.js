const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('./Counter'); // make sure the path is correct

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  lat: {
    type: Number
  },
  lng: {
    type: Number
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },
  address: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user','biz-user','admin'],
    default: 'user'
  },
  fcmToken: {
    type: String
  },
  numericUid: {
    type: Number,
    unique: true,
    required: false
  },
  profilePic: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reportedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  isPremium: {
    type: Boolean,
    default: false
  },
  premiumType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    set: value => (value === 'null' ? null : value)
  },
  premiumExpiry: {
    type: Date,
    default: null
  },
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordOTPExpires: {
    type: Date,
    default: null
  },
  totalFundReceived: {
    type: Number,
    default: 0
  },
  resetPasswordOTPVerified: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOTP: {
    type: String,
    default: null
  },
  verificationOTPExpires: {
    type: Date,
    default: null
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  bankDetails: {
    accountHolderName: { type: String, trim: true },
    routingNumber: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountType: {
      type: String,
      enum: ['checking', 'savings'],
      lowercase: true
    },
    bankAddress: { type: String, trim: true }
  }

}, {
  timestamps: true
});

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      console.log("Running pre-save hook to assign numericUid...");

      const counter = await Counter.findByIdAndUpdate(
        { _id: 'userNumericId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      console.log("Counter value:", counter?.seq);

      if (!counter) {
        throw new Error("Counter not found or failed to update.");
      }

      this.numericUid = counter.seq;
    }

    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    if (this.isModified('lat') || this.isModified('lng')) {
      if (this.lat != null && this.lng != null) {
        this.location = {
          type: 'Point',
          coordinates: [this.lng, this.lat]
        };
      }
    }

    next();
  } catch (err) {
    console.error("Error in user pre-save hook:", err);
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
