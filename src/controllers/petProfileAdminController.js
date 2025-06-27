const PetProfile = require('../models/PetProfile');
const User = require('../models/User');

// Get all pet profiles (with pagination, search, and filtering)
exports.getAllPetProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', petType, lostStatus } = req.query;
    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
        { tagId: { $regex: search, $options: 'i' } },
        { microchipNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (petType) query.petType = petType;
    if (lostStatus !== undefined) query.lostStatus = lostStatus === 'true';

    const petProfiles = await PetProfile.find(query)
      .populate({
        path: 'user',
        select: 'name email numericUid profilePic role isPremium',
      })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await PetProfile.countDocuments(query);

    res.status(200).json({
      petProfiles,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: skip + petProfiles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get pet profile by ID (detailed)
exports.getPetProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const petProfile = await PetProfile.findById(id)
      .populate({
        path: 'user',
        select: 'name email numericUid profilePic role isPremium',
      });
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }
    res.status(200).json({ petProfile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update pet profile
exports.updatePetProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;
    delete updateData.user; // Don't allow changing the user

    const petProfile = await PetProfile.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'user',
      select: 'name email numericUid profilePic role isPremium',
    });

    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }
    res.status(200).json({ message: 'Pet profile updated successfully', petProfile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete pet profile
exports.deletePetProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const petProfile = await PetProfile.findByIdAndDelete(id).populate({
      path: 'user',
      select: 'name email numericUid profilePic role isPremium',
    });
    if (!petProfile) {
      return res.status(404).json({ message: 'Pet profile not found' });
    }
    res.status(200).json({ message: 'Pet profile deleted successfully', deletedPetProfile: petProfile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 