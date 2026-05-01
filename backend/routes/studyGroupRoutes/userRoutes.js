const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/study-group/users — all users
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find({}, 'studentId name role isSenior module');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/study-group/users/seniors — senior students only
router.get('/seniors', protect, async (req, res) => {
  try {
    const seniors = await User.find({ isSenior: true }, 'studentId name module');
    res.json(seniors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/study-group/users/me — current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, '-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
