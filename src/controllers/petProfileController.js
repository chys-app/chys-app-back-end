const PetProfile = require('../models/PetProfile');
const { cloudinary } = require('../config/cloudinary');

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

    // Handle profile picture update
    if (req.files && req.files.length > 0) {
      // Delete old profile picture from Cloudinary if exists
      if (petProfile.profilePic) {
        const publicId = petProfile.profilePic.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      petProfile.profilePic = req.files[0].path;
    }

    // Handle additional photos update
    if (req.files && req.files.length > 1) {
      // Delete old photos from Cloudinary
      if (petProfile.photos && petProfile.photos.length > 0) {
        for (const photo of petProfile.photos) {
          const publicId = photo.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
      }
      petProfile.photos = req.files.slice(1).map(file => file.path);
    }

    // Update other fields
    const updates = Object.keys(req.body);
    updates.forEach(update => {
      if (update === 'personalityTraits' || update === 'allergies') {
        petProfile[update] = JSON.parse(req.body[update]);
      } else {
        petProfile[update] = req.body[update];
      }
    });

    await petProfile.save();
    res.json(petProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete pet profile
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

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const users = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 50000 // 50 km in meters
        }
      }
    }).select('_id');

    const userIds = users.map(u => u._id);

    const pets = await PetProfile.find({ user: { $in: userIds } }).populate('user', 'name email location');

    res.status(200).json({ pets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPetById = async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await PetProfile.findById(id).populate('user', 'name email location');
    if (!pet) return res.status(404).json({ message: 'Pet not found' });

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