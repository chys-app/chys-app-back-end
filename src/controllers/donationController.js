const Donation = require('../models/Donation');
const Admin = require('../models/Admin');

// Create a new donation campaign (admin only)
exports.createDonation = async (req, res) => {
  try {
    const { title, description, targetAmount } = req.body;
    if (!title || !description || !targetAmount) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    let imageUrl = '';
    if (req.file && req.file.path) {
      imageUrl = req.file.path;
    }
    const donation = new Donation({
      title,
      description,
      targetAmount,
      createdBy: req.admin._id,
      image: imageUrl
    });
    await donation.save();
    res.status(201).json({ message: 'Donation campaign created.', donation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all donation campaigns
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find().populate('createdBy', 'email');
    res.status(200).json({ donations });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get a single donation campaign by ID
exports.getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id).populate('createdBy', 'email');
    if (!donation) {
      return res.status(404).json({ message: 'Donation campaign not found.' });
    }
    res.status(200).json({ donation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a donation campaign (admin only)
exports.updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, targetAmount, isActive } = req.body;
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation campaign not found.' });
    }
    // Only the admin who created the campaign can update it
    if (donation.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (title) donation.title = title;
    if (description) donation.description = description;
    if (targetAmount) donation.targetAmount = targetAmount;
    if (typeof isActive === 'boolean') donation.isActive = isActive;
    if (req.file && req.file.path) {
      donation.image = req.file.path;
    }
    await donation.save();
    res.status(200).json({ message: 'Donation campaign updated.', donation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a donation campaign (admin only)
exports.deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation campaign not found.' });
    }
    // Only the admin who created the campaign can delete it
    if (donation.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await donation.deleteOne();
    res.status(200).json({ message: 'Donation campaign deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 