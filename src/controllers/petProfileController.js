const PetProfile = require('../models/PetProfile');
const { cloudinary } = require('../config/cloudinary');

// Create pet profile
const createPetProfile = async (req, res) => {
  try {
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

    // Handle profile picture upload
    let profilePic = '';
    if (req.files && req.files.length > 0) {
      profilePic = req.files[0].path;
    }

    // Handle additional photos upload
    const photos = [];
    if (req.files && req.files.length > 1) {
      req.files.slice(1).forEach(file => {
        photos.push(file.path);
      });
    }

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
      personalityTraits: personalityTraits ? JSON.parse(personalityTraits) : [],
      allergies: allergies ? JSON.parse(allergies) : [],
      specialNeeds,
      feedingInstructions,
      dailyRoutine
    });

    await petProfile.save();
    res.status(201).json(petProfile);
  } catch (error) {
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

module.exports = {
  createPetProfile,
  getPetProfile,
  updatePetProfile,
  deletePetProfile
}; 