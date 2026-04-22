const express = require('express');
const PdfResource = require('../../models/PdfResource');
const protect = require('../../middleware/authMiddleware');

const router = express.Router();

// GET all PDFs
router.get('/', protect, async (req, res) => {
  try {
    const moduleFilter = req.query.module;
    const query = moduleFilter ? { module: moduleFilter } : {};
    const pdfs = await PdfResource.find(query).populate('author', 'name');
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Upload new PDF
router.post('/', protect, async (req, res) => {
  try {
    const { title, module, size, fileName } = req.body;
    
    if (!title || !module || !size || !fileName) {
      return res.status(400).json({ message: 'Title, module, size, and fileName are required' });
    }

    const pdf = new PdfResource({
      title,
      module,
      size,
      author: req.user.id,
      fileUrl: `/uploads/pdfs/${fileName}-${Date.now()}.pdf`
    });

    const savedPdf = await pdf.save();
    await savedPdf.populate('author', 'name');
    res.status(201).json(savedPdf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Remove PDF
router.delete('/:id', protect, async (req, res) => {
  try {
    const pdf = await PdfResource.findById(req.params.id);
    if (!pdf) return res.status(404).json({ message: 'PDF not found' });
    if (pdf.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this PDF' });
    }
    await pdf.deleteOne();
    res.json({ message: 'PDF deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
