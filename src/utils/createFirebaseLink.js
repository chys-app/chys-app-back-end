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
            domainUriPrefix: "https://ocdcleaner.page.link",
            link: verifyUrl, // 👈 backend email verification link
            androidInfo: {
              androidPackageName: "com.example.chys", // ✅ match working one
              androidFallbackLink: verifyUrl // optional
            },
            iosInfo: {
              iosBundleId: "com.app.chys", // ✅ match working one
              iosFallbackLink: verifyUrl // optional
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
        console.error('Firebase Dynamic Link creation failed:', err.response?.data || err.message);
      console.error('Firebase Dynamic Link creation failed:', err.message);
      return verifyUrl;
    }
  };
  
  module.exports = createFirebaseLink;