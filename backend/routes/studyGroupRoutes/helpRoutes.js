const express = require('express');
const router = express.Router();
const HelpRequest = require('../../models/HelpRequest');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/study-group/help
router.get('/', protect, async (req, res) => {
  try {
    const requests = await HelpRequest.find()
      .populate('user', 'studentId name')
      .populate('assignedTo', 'studentId name');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/study-group/help/my
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await HelpRequest.find({ user: req.user._id });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/study-group/help
router.post('/', protect, async (req, res) => {
  try {
    const { topic, message } = req.body;
    const request = new HelpRequest({ user: req.user._id, topic, message });
    const saved = await request.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/study-group/help/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const request = await HelpRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) return res.status(404).json({ message: 'Help request not found' });
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/study-group/help/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Help request not found' });
    await request.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
