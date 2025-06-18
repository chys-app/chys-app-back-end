// controllers/podcastController.js
const Podcast = require('../models/Podcast');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const generateAgoraToken = require('../utils/agoraTokenGen');
const User = require('../models/User');
const admin = require('../config/firebaseAdmin')

exports.createPodcast = asyncHandler(async (req, res) => {
  const { title, description, guests, petProfiles, scheduledAt } = req.body;

  if (!title || !scheduledAt) {
    return res.status(400).json({ message: 'Title and scheduledAt are required.' });
  }

  const channelName = uuidv4(); // Agora channel
  const podcast = await Podcast.create({
    host: req.user._id,
    guests,
    petProfiles,
    title,
    description,
    scheduledAt,
    agoraChannel: channelName
  });

  // 🔔 Notify Guests
  const guestUsers = await User.find({ _id: { $in: guests }, fcmToken: { $ne: null } });

  const messages = guestUsers.map(user => ({
    token: user.fcmToken,
    notification: {
      title: 'Podcast Invitation 🎙️',
      body: `${req.user.name} has invited you to a podcast on ${new Date(scheduledAt).toLocaleString()}`
    },
    data: {
      type: 'PODCAST_INVITE',
      podcastId: podcast._id.toString()
    }
  }));

  // Send each notification
  const response = await Promise.all(
    messages.map(msg => admin.messaging().send(msg).catch(err => null))
  );

  res.status(201).json({ success: true, podcast });
});

exports.getPodcastToken = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return res.status(404).json({ message: 'Podcast not found' });
  }

  const isAllowed =
    podcast.host.toString() === req.user._id.toString() ||
    podcast.guests.map(id => id.toString()).includes(req.user._id.toString());

  if (!isAllowed) {
    return res.status(403).json({ message: 'Not authorized to join this podcast' });
  }

  const token = generateAgoraToken(podcast.agoraChannel, req.user.numericUid);

  res.json({
    token,
    channelName: podcast.agoraChannel,
    uid: req.user.numericUid
  });
});

exports.getUserPodcasts = asyncHandler(async (req, res) => {
  const hosted = await Podcast.find({ host: req.user._id });
  const guest = await Podcast.find({ guests: req.user._id });

  res.json({
    hosted,
    guest
  });
});