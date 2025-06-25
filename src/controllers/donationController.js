const Donation = require('../models/Donation');
const Admin = require('../models/Admin');
const DonationTransaction = require('../models/DonationTransaction');
const User = require('../models/User');
const PetProfile = require('../models/PetProfile');

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

exports.recordDonationTransaction = async (req, res) => {
  try {
    const { donationId, amount } = req.body;
    const userId = req.user._id;

    if (!donationId || !amount) {
      return res.status(400).json({ message: 'Donation ID and amount are required.' });
    }

    const donation = await Donation.findById(donationId);
    if (!donation || !donation.isActive) {
      return res.status(404).json({ message: 'Donation campaign not found or inactive.' });
    }

    // Check if adding this amount exceeds the target
    const remainingAmount = donation.targetAmount - donation.collectedAmount;
    if (amount > remainingAmount) {
      return res.status(400).json({
        message: `Donation exceeds target amount. Only ${remainingAmount} is remaining.`
      });
    }

    // Create and save the transaction
    const transaction = new DonationTransaction({
      donationId,
      userId,
      amount,
      status: 'completed'
    });

    await transaction.save();

    // Update collected amount
    donation.collectedAmount += amount;
    await donation.save();

    res.status(201).json({
      message: 'Donation recorded successfully.',
      transaction,
      updatedCollectedAmount: donation.collectedAmount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sevenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

    // 🔹 Cards Data
    const totalUsers = await User.countDocuments();
    const usersThisWeek = await User.countDocuments({ createdAt: { $gte: startOfWeek } });
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    const totalPets = await PetProfile.countDocuments();

    const donations = await DonationTransaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalDonations = donations[0]?.total || 0;

    // 🔹 Weekly Graph Data (last 7 days)
    const graphData = await Promise.all([...Array(7)].map(async (_, i) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const users = await User.countDocuments({ createdAt: { $gte: day, $lt: nextDay } });
      const donations = await DonationTransaction.aggregate([
        {
          $match: {
            status: 'completed',
            donatedAt: { $gte: day, $lt: nextDay }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const pets = await PetProfile.countDocuments({ createdAt: { $gte: day, $lt: nextDay } });

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        users,
        donations: donations[0]?.total || 0,
        pets
      };
    }));

    // 🔹 User Growth (Last 7 Months)
    const monthlyUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const growthMap = new Map();
    monthlyUsers.forEach(({ _id, total }) => {
      const label = `M${_id.month}`;
      growthMap.set(label, total);
    });

    const userGrowth = [...Array(7)].map((_, i) => {
      const month = new Date(today.getFullYear(), today.getMonth() - 6 + i, 1);
      const label = `M${month.getMonth() + 1}`;
      return growthMap.get(label) || 0;
    });

    // 🔹 Response
    res.json({
      stats: {
        totalUsers,
        usersThisWeek,
        usersThisMonth,
        totalDonations,
        totalPets
      },
      graphData,
      userGrowth
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};