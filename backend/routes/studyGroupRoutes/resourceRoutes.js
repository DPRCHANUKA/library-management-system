const express = require('express');
const router = express.Router();
const PdfResource = require('../../models/PdfResource');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/study-group/resources
router.get('/', async (req, res) => {
  try {
    const resources = await PdfResource.find()
      .populate('author', 'studentId name')
      .populate('group', 'title');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/study-group/resources/:id
router.get('/:id', async (req, res) => {
  try {
    const resource = await PdfResource.findById(req.params.id)
      .populate('author', 'studentId name');
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/study-group/resources/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const resource = await PdfResource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    if (resource.author.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized' });
    await resource.deleteOne();
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
