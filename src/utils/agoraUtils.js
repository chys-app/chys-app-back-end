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

const recordingSessions = {}; // In-memory cache (optional)

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

  const res = await axios.post(
    `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
    {
      cname: channel,
      uid,
      clientRequest: {
        recordingConfig: {
          maxIdleTime: 30,
          streamTypes: 2,
          channelType: 1,
          videoStreamType: 0,
        },
        storageConfig: {
          vendor: 1, // 1 = AWS S3
          region: 1, // Replace if you're using a different S3 region
          bucket: process.env.AWS_S3_BUCKET,
          accessKey: process.env.AWS_ACCESS_KEY,
          secretKey: process.env.AWS_SECRET_KEY,
          fileNamePrefix: ["podcasts", podcastId],
        },
      },
    },
    getAgoraAuth()
  );

  const sid = res.data.sid;

  // Store session (optional, or you can save to DB)
  recordingSessions[podcastId] = { resourceId, sid };

  return { resourceId, sid };
}

async function stopRecording(podcastId, channel, uid) {
  const session = recordingSessions[podcastId];
  if (!session) throw new Error("No recording session found");

  const { resourceId, sid } = session;

  const res = await axios.post(
    `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
    {
      cname: channel,
      uid,
      clientRequest: {},
    },
    getAgoraAuth()
  );

  delete recordingSessions[podcastId]; // Clean up cache

  const recordingUrl = res.data?.serverResponse?.fileList?.[0] ?? null;

  return {
    recordingUrl,
    raw: res.data,
  };
}

module.exports = {
  startRecording,
  stopRecording,
};
