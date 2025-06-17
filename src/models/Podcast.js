const mongoose = require("mongoose");

const podcastSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  guests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  petProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "PetProfile" }], // Optional
  title: { type: String, required: true },
  description: { type: String },
  scheduledAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["scheduled", "live", "ended"],
    default: "scheduled",
  },
  agoraChannel: { type: String, required: true }, // Channel name
  recordingUrl: { type: String }, // Optional: Save recording file URL
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Podcast", podcastSchema);
