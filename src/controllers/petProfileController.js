const PetProfile = require('../models/PetProfile');

// Create pet profile
const createPetProfile = async (req, res) => {
  try {
    const petProfile = new PetProfile({
      ...req.body,
      user: req.user._id
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
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'isHavePet', 'petType', 'profilePic', 'name', 'breed', 'sex',
    'dateOfBirth', 'bio', 'photos', 'color', 'size', 'weight',
    'marks', 'microchipNumber', 'tagId', 'lostStatus',
    'vaccinationStatus', 'vetName', 'vetContactNumber',
    'personalityTraits', 'allergies', 'specialNeeds',
    'feedingInstructions', 'dailyRoutine'
  ];
  
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const petProfile = await PetProfile.findOne({ user: req.user._id });
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }

    updates.forEach(update => petProfile[update] = req.body[update]);
    await petProfile.save();
    res.json(petProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete pet profile
const deletePetProfile = async (req, res) => {
  try {
    const petProfile = await PetProfile.findOneAndDelete({ user: req.user._id });
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }
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