// controllers/podcastController.js
const Podcast = require('../models/Podcast');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const generateAgoraToken = require('../utils/agoraTokenGen');
const User = require('../models/User');
const admin = require('../config/firebaseAdmin')
const { sendNotification } = require('../utils/notificationUtil');
const { startRecording, stopRecording } = require('../utils/agoraUtils');

exports.createPodcast = asyncHandler(async (req, res) => {
  const { title, description, guests, petProfiles, scheduledAt } = req.body;

  if (!title || !scheduledAt) {
    return res.status(400).json({ message: 'Title and scheduledAt are required.' });
  }

  const channelName = uuidv4();

  const podcast = await Podcast.create({
    host: req.user._id,
    guests,
    petProfiles,
    title,
    description,
    scheduledAt,
    agoraChannel: channelName
  });

  await sendNotification({
    userIds: guests,
    title: 'Podcast Invitation 🎙️',
    message: `${req.user.name} has invited you to a podcast on ${new Date(scheduledAt).toLocaleString()}`,
    type: 'PODCAST_INVITE',
    data: {
      podcastId: podcast._id.toString(),
    }
  });

  res.status(201).json({ success: true, podcast });
});


exports.editPodcast = asyncHandler(async (req, res) => {
  const podcastId = req.params.id;
  const { title, description, guests, petProfiles, scheduledAt } = req.body;

  // Validate input
  if (!podcastId) {
    return res.status(400).json({ message: 'Podcast ID is required.' });
  }

  const podcast = await Podcast.findById(podcastId);

  if (!podcast) {
    return res.status(404).json({ message: 'Podcast not found.' });
  }

  // Only host can update
  if (podcast.host.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You are not authorized to edit this podcast.' });
  }

  // Update allowed fields
  if (title) podcast.title = title;
  if (description) podcast.description = description;
  if (Array.isArray(guests)) podcast.guests = guests;
  if (Array.isArray(petProfiles)) podcast.petProfiles = petProfiles;
  if (scheduledAt) podcast.scheduledAt = scheduledAt;

  await podcast.save();

  // Optionally: Send updated invitations to guests (if changed)
  if (Array.isArray(guests)) {
    const guestUsers = await User.find({ _id: { $in: guests }, fcmToken: { $ne: null } });

    const messages = guestUsers.map(user => ({
      token: user.fcmToken,
      notification: {
        title: 'Podcast Updated ✏️',
        body: `${req.user.name} has updated the podcast scheduled on ${new Date(podcast.scheduledAt).toLocaleString()}`
      },
      data: {
        type: 'PODCAST_UPDATE',
        podcastId: podcast._id.toString()
      }
    }));

    await Promise.all(
      messages.map(msg => admin.messaging().send(msg).catch(err => null))
    );
  }

  res.json({ success: true, podcast });
});

exports.getPodcastToken = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);
  if (!podcast) return res.status(404).json({ message: 'Podcast not found' });

  const userId = req.user._id.toString();
  const isHost = podcast.host.toString() === userId;
  const isGuest = podcast.guests.some(id => id.toString() === userId);

  if (!isHost && !isGuest) {
    return res.status(403).json({ message: 'Not authorized to join this podcast' });
  }

  // Fetch host's numeric UID for token & recording
  const hostUser = await User.findById(podcast.host).select('numericUid');
  if (!hostUser || typeof hostUser.numericUid !== 'number') {
    return res.status(500).json({ message: 'Failed to retrieve host numeric UID' });
  }

  // Start recording when host joins for the first time
  if (isHost && podcast.status !== 'live') {
    podcast.status = 'live';

    if (!podcast.agoraSession?.sid) {
      try {
        const { resourceId, sid } = await startRecording(
          podcast._id.toString(),
          podcast.agoraChannel,
          hostUser.numericUid
        );
        podcast.agoraSession = { resourceId, sid };
      } catch (err) {
        console.log(err)
        console.error('Failed to start recording:', err.message);
        return res.status(500).json({ message: 'Failed to start recording' });
      }
    }

    await podcast.save();
  }

  const token = generateAgoraToken(podcast.agoraChannel, req.user.numericUid);

  res.json({
    token,
    channelName: podcast.agoraChannel,
    uid: req.user.numericUid,
    hostNumericUid: hostUser.numericUid,
  });
});

exports.endPodcast = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);
  if (!podcast) return res.status(404).json({ message: 'Podcast not found' });

  if (podcast.host.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the host can end the podcast' });
  }

  if (podcast.status === 'ended') {
    return res.status(400).json({ message: 'Podcast already ended' });
  }

  try {
    const hostUser = await User.findById(podcast.host).select('numericUid');
    if (!hostUser || typeof hostUser.numericUid !== 'number') {
      return res.status(500).json({ message: 'Failed to retrieve host numeric UID' });
    }

    const { recordingUrl } = await stopRecording(
      podcast._id.toString(),
      podcast.agoraChannel,
      hostUser.numericUid
    );

    podcast.status = 'ended';
    podcast.recordingUrl = recordingUrl || null;
    podcast.agoraSession = undefined;
    await podcast.save();

    res.json({
      message: 'Podcast ended and recording stopped',
      recordingUrl,
    });
  } catch (err) {
    console.error('Stop recording error:', err.message);
    res.status(500).json({ message: 'Failed to stop recording' });
  }
});

exports.getUserPodcasts = asyncHandler(async (req, res) => {
  const podcasts = await Podcast.find({
    $or: [
      { host: req.user._id },
      { guests: req.user._id }
    ]
  })
    .sort({ scheduledAt: -1 })
    .populate({
      path: 'host',
      select: 'name bio profilePic'
    })
    .populate({
      path: 'guests',
      select: 'name bio profilePic'
    })
    .populate({
      path: 'petProfiles',
      select: 'name profilePic user',
      populate: {
        path: 'user',
        select: 'name' // optional: for clarity, though we already get this from `host` and `guests`
      }
    });

  res.json({
    success: true,
    podcasts
  });
});