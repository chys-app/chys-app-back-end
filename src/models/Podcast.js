const mongoose = require("mongoose");

const podcastSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  guests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  petProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "PetProfile" }],

  title: { type: String, required: true },
  description: { type: String },
  scheduledAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["scheduled", "live", "ended"],
    default: "scheduled",
  },

  agoraChannel: { type: String, required: true },
  agoraSession: {
    resourceId: String,
    sid: String,
  },
  recordingUrl: { type: String }, 

  heading1: {
    text: { type: String, default: "" },
    font: { type: String, default: "" },
    color: { type: String, default: "#000000" },
  },
  heading2: {
    text: { type: String, default: "" },
    font: { type: String, default: "" },
    color: { type: String, default: "#000000" },
  },
  bannerLine: {
    text: { type: String, default: "" },
    font: { type: String, default: "" },
    color: { type: String, default: "#000000" },
    background: { type: String, default: "#FFFFFF" },
  },
  bannerImage: {
    type: String, 
    default: null,
  },
  funds: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Podcast", podcastSchema);
