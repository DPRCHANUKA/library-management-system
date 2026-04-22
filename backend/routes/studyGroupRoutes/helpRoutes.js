const express = require('express');
const HelpRequestModel = require('../../models/HelpRequest');
const protect = require('../../middleware/authMiddleware');

const router = express.Router();

// POST ask for help
router.post('/', protect, async (req, res) => {
  const { topic, message } = req.body;
  try {
    const helpReq = await HelpRequestModel.create({
      user: req.user.id,
      topic,
      message,
    });
    res.status(201).json(helpReq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
