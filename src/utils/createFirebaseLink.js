const axios = require('axios');
const dotenv = require('dotenv')
dotenv.config()
const createFirebaseLink = async (verifyUrl) => {
  try {
    const firebaseApiKey = process.env.FIREBASE_API_KEY;

    const res = await axios.post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${firebaseApiKey}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: "https://ocdcleaner.page.link", // Your Firebase dynamic link domain
          link: verifyUrl, // Actual backend verify link
          androidInfo: {
            androidPackageName: "com.chysapp.android"
          },
          iosInfo: {
            iosBundleId: "com.example.chys"
          },
          navigationInfo: {
            enableForcedRedirect: true
          },
          socialMetaTagInfo: {
            socialTitle: "Verify Your Email",
            socialDescription: "Tap to verify your account on CHYS"
          }
        }
      }
    );

    return res.data.shortLink;
  } catch (err) {
    console.error('Firebase Dynamic Link creation failed:', err.message);
    return verifyUrl; // fallback to direct URL
  }
};

module.exports = createFirebaseLink;
