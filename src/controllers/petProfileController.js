const PetProfile = require('../models/PetProfile');
const { cloudinary } = require('../config/cloudinary');
const User = require('../models/User');

// Create pet profile
const createPetProfile = async (req, res) => {
  try {
    console.log('Received request to create pet profile');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const {
      isHavePet,
      petType,
      name,
      breed,
      race,
      ownerContactNumber,
      address,
      sex,
      dateOfBirth,
      bio,
      color,
      size,
      weight,
      marks,
      microchipNumber,
      tagId,
      lostStatus,
      vaccinationStatus,
      vetName,
      vetContactNumber,
      personalityTraits,
      allergies,
      specialNeeds,
      feedingInstructions,
      dailyRoutine
    } = req.body;

    // Handle profile picture
    let profilePic = '';
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      profilePic = req.files.profilePic[0].path;
      console.log('Profile picture path:', profilePic);
    }

    // Handle additional photos
    const photos = [];
    if (req.files && req.files.photos && req.files.photos.length > 0) {
      req.files.photos.forEach(file => {
        photos.push(file.path);
      });
      console.log('Additional photo paths:', photos);
    }

    const parsedPersonalityTraits = personalityTraits ? JSON.parse(personalityTraits) : [];
    const parsedAllergies = allergies ? JSON.parse(allergies) : [];

    console.log('Parsed personalityTraits:', parsedPersonalityTraits);
    console.log('Parsed allergies:', parsedAllergies);

    const petProfile = new PetProfile({
      user: req.user._id,
      isHavePet,
      petType,
      profilePic,
      name,
      breed,
      race,
      ownerContactNumber,
      address: address ? (typeof address === 'string' ? JSON.parse(address) : address) : undefined,
      sex,
      dateOfBirth,
      bio,
      photos,
      color,
      size,
      weight,
      marks,
      microchipNumber,
      tagId,
      lostStatus,
      vaccinationStatus,
      vetName,
      vetContactNumber,
      personalityTraits: parsedPersonalityTraits,
      allergies: parsedAllergies,
      specialNeeds,
      feedingInstructions,
      dailyRoutine
    });

    console.log('Saving pet profile to database...');
    await petProfile.save();
    console.log('Pet profile saved successfully:', petProfile);

    res.status(201).json(petProfile);
  } catch (error) {
    console.error('Error while creating pet profile:', error);
    res.status(400).json({ message: error.message });
  }
};



// Get pet profile
const getPetProfile = async (req, res) => {
  try {
    const petProfile = await PetProfile.findOne({ user: req.user._id });
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }
    res.json(petProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update pet profile
const updatePetProfile = async (req, res) => {
  try {
    const petProfile = await PetProfile.findOne({ user: req.user._id });

    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }

    /** --------------------------
     * 1. REMOVE SELECTED PHOTOS
     * --------------------------- */
    if (req.body.removePhotos) {
      let removeList = req.body.removePhotos;

      // If frontend sends as JSON string, parse it
      if (typeof removeList === 'string') {
        try {
          removeList = JSON.parse(removeList);
        } catch {
          return res.status(400).json({ message: 'Invalid removePhotos format' });
        }
      }

      if (Array.isArray(removeList)) {
        for (const url of removeList) {
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
          petProfile.photos = petProfile.photos.filter(photo => photo !== url);
        }
      }
    }

    /** --------------------------
     * 2. UPDATE PROFILE PIC
     * --------------------------- */
    if (req.files?.profilePic?.length > 0) {
      if (petProfile.profilePic) {
        const publicId = petProfile.profilePic.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      petProfile.profilePic = req.files.profilePic[0].path;
    }

    /** --------------------------
     * 3. ADD NEW ADDITIONAL PHOTOS
     * --------------------------- */
    if (req.files?.photos?.length > 0) {
      const newPhotoPaths = req.files.photos.map(file => file.path);
      petProfile.photos = [...(petProfile.photos || []), ...newPhotoPaths];
    }

    /** --------------------------
     * 4. UPDATE OTHER FIELDS
     * --------------------------- */
    const updates = Object.keys(req.body);
    updates.forEach(update => {
      if (update === 'personalityTraits' || update === 'allergies') {
        petProfile[update] = JSON.parse(req.body[update]);
      } else if (update === 'address') {
        petProfile[update] = typeof req.body[update] === 'string'
          ? JSON.parse(req.body[update])
          : req.body[update];
      } else if (update !== 'removePhotos') {
        petProfile[update] = req.body[update];
      }
    });

    await petProfile.save();
    res.json(petProfile);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



const deletePetProfile = async (req, res) => {
  try {
    const petProfile = await PetProfile.findOne({ user: req.user._id });
    
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }

    // Delete profile picture from Cloudinary if exists
    if (petProfile.profilePic) {
      const publicId = petProfile.profilePic.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete additional photos from Cloudinary
    if (petProfile.photos && petProfile.photos.length > 0) {
      for (const photo of petProfile.photos) {
        const publicId = photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await petProfile.remove();
    res.json({ message: 'Pet profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getNearbyPets = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const currentUserId = req.user._id;

    // Get current user's blocked users and users who blocked them
    const currentUser = await User.findById(currentUserId)
      .select('blockedUsers')
      .lean();

    const blockedUserIds = currentUser?.blockedUsers || [];

    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: currentUserId })
      .select('_id')
      .lean();

    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id);

    // Combine all blocked user IDs
    const allBlockedIds = [...blockedUserIds, ...blockedByUserIds];

    let usersQuery = { _id: { $nin: allBlockedIds } };

    // If lat/lng are provided, add location filter
    if (lat && lng) {
      usersQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 50000 // 50 km in meters
        }
      };
    }

    const users = await User.find(usersQuery).select('_id');
    const userIds = users.map(u => u._id);

    const pets = await PetProfile.find({ user: { $in: userIds } })
      .populate('user', 'name email location');

    res.status(200).json({ pets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const pet = await PetProfile.findById(id).populate('user', 'name email location');
    if (!pet) return res.status(404).json({ message: 'Pet not found' });

    // Check if users are blocked from each other
    const currentUser = await User.findById(currentUserId).select('blockedUsers').lean();
    const petOwner = await User.findById(pet.user._id).select('blockedUsers').lean();

    if (!petOwner) {
      return res.status(404).json({ message: 'Pet owner not found' });
    }

    // Check if current user is blocked by pet owner or has blocked pet owner
    if (currentUser.blockedUsers.includes(pet.user._id) || petOwner.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({ 
        message: 'Cannot view pet from blocked user',
        blocked: true
      });
    }

    res.status(200).json({ pet });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createPetProfile,
  getPetProfile,
  updatePetProfile,
  deletePetProfile,
  getNearbyPets,
  getPetById
}; 