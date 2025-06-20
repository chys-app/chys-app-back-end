const axios = require("axios");
require("dotenv").config();

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;

const getAgoraAuth = () => ({
  auth: {
    username: AGORA_CUSTOMER_ID,
    password: AGORA_CUSTOMER_SECRET,
  },
});

const recordingSessions = {}; // In-memory cache

async function acquireResource(channel, uid) {
  const res = await axios.post(
    `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
    {
      cname: channel,
      uid: uid.toString(),
      clientRequest: {},
    },
    getAgoraAuth()
  );
  return res.data.resourceId;
}

async function startRecording(podcastId, channel, uid) {
  const resourceId = await acquireResource(channel, uid);
  console.log('[Agora] Acquired resourceId:', resourceId);

  const res = await axios.post(
    `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
    {
      cname: channel,
      uid: uid.toString(),
      clientRequest: {
        recordingConfig: {
          maxIdleTime: 300,
          streamTypes: 2,
          channelType: 1,
          videoStreamType: 0,
        },
        storageConfig: {
          vendor: 1, // AWS S3
          region: 1,
          bucket: process.env.AWS_S3_BUCKET,
          accessKey: process.env.AWS_ACCESS_KEY,
          secretKey: process.env.AWS_SECRET_KEY,
          fileNamePrefix: ["podcasts", podcastId],
        },
      },
    },
    getAgoraAuth()
  );

  if (!res.data.sid) {
    console.error('[Agora] No SID returned in start response:', res.data);
    throw new Error('Start recording failed: No SID');
  }

  const sid = res.data.sid;
  console.log('[Agora] Start recording response:', res.data);

  recordingSessions[podcastId] = { resourceId, sid };

  return { resourceId, sid };
}

async function stopRecording(podcastId, channel, uid) {
  let session = recordingSessions[podcastId];

  if (!session) {
    console.warn('[Agora] No session in memory, checking DB...');

    const Podcast = require("../models/Podcast");
    const podcast = await Podcast.findById(podcastId);

    if (!podcast || !podcast.agoraSession) {
      throw new Error("No recording session found in memory or DB");
    }

    session = podcast.agoraSession;
  }

  const { resourceId, sid } = session;

  console.log('[Agora] Stopping recording with:', { resourceId, sid, channel });

  const url = `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;
  console.log('[Agora] Stop URL:', url);

  const res = await axios.post(
    url,
    {
      cname: channel,
      uid: uid.toString(),
      clientRequest: {
        async_stop: true,
      },
    },
    getAgoraAuth()
  );

  delete recordingSessions[podcastId];

  const recordingUrl = res.data?.serverResponse?.fileList?.[0] ?? null;

  return {
    recordingUrl,
    raw: res.data,
  };
}
async function queryRecordingStatus(podcastId) {
  const session = recordingSessions[podcastId];
  if (!session) throw new Error("No active session");

  const { resourceId, sid, channel } = session;

  const res = await axios.post(
    `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
    {
      cname: channel,
      uid: "5", // Same UID used to start recording
      clientRequest: {}
    },
    getAgoraAuth()
  );

  return res.data;
}

module.exports = {
  startRecording,
  stopRecording,
  queryRecordingStatus
};