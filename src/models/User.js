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
  role: {
    type: String,
    enum: ['user', 'admin'],
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
  profilePic:{
    type:String,
    default: ""
  },
  bio:{
    type: String,
    default: ""
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



userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
