const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudyGroup = require('../../models/StudyGroup');
const { protect } = require('../../middleware/authMiddleware');

// ── Multer setup for PDF uploads ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../../uploads/study-groups');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB

// ── GET /api/study-group/groups ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const groups = await StudyGroup.find()
      .populate('leader', 'studentId name')
      .populate('members', 'studentId name')
      .populate('attachments.uploadedBy', 'studentId name');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/study-group/groups/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id)
      .populate('leader', 'studentId name')
      .populate('members', 'studentId name')
      .populate('pendingRequests', 'studentId name')
      .populate('attachments.uploadedBy', 'studentId name');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/study-group/groups ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { title, module, path: groupPath, isPrivate, maxMembers } = req.body;
    const group = new StudyGroup({
      title,
      module,
      path: groupPath || module,
      isPrivate: isPrivate || false,
      maxMembers: maxMembers || 10,
      leader: req.user._id,
      members: [req.user._id],
    });
    const saved = await group.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /api/study-group/groups/:id ──────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized' });
    Object.assign(group, req.body);
    const updated = await group.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /api/study-group/groups/:id ───────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized' });
    // Remove all attached PDF files from disk
    group.attachments.forEach(att => {
      const filePath = path.join(uploadsDir, att.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/study-group/groups/:id/join ────────────────────────────────────
router.post('/:id/join', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const userId = req.user._id.toString();
    if (group.members.map(m => m.toString()).includes(userId))
      return res.status(400).json({ message: 'Already a member' });
    if (group.members.length >= group.maxMembers)
      return res.status(400).json({ message: 'Group is full' });
    if (group.isPrivate) {
      if (!group.pendingRequests.map(p => p.toString()).includes(userId))
        group.pendingRequests.push(req.user._id);
      await group.save();
      return res.json({ message: 'Join request sent' });
    }
    group.members.push(req.user._id);
    await group.save();
    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/study-group/groups/:id/approve/:userId ─────────────────────────
router.post('/:id/approve/:userId', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized' });
    group.pendingRequests = group.pendingRequests.filter(u => u.toString() !== req.params.userId);
    if (!group.members.map(m => m.toString()).includes(req.params.userId))
      group.members.push(req.params.userId);
    await group.save();
    res.json({ message: 'Member approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PDF ATTACHMENT ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/study-group/groups/:id/attachments  (upload PDF) ───────────────
router.post('/:id/attachments', protect, upload.single('pdf'), async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Only members or admin may upload
    const userId = req.user._id.toString();
    const isMember = group.members.map(m => m.toString()).includes(userId);
    const isLeader = group.leader.toString() === userId;
    if (!isMember && !isLeader && !req.user.isAdmin)
      return res.status(403).json({ message: 'Only group members can upload PDFs' });

    if (!req.file) return res.status(400).json({ message: 'No PDF file provided' });

    const sizeKB = req.file.size / 1024;
    const sizeMB = sizeKB / 1024;
    const sizeLabel = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;

    const attachment = {
      filename: req.file.originalname,
      storedName: req.file.filename,
      fileUrl: `/uploads/study-groups/${req.file.filename}`,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      size: sizeLabel,
    };

    group.attachments.push(attachment);
    await group.save();

    // Return the newly added attachment with populated uploader
    const populated = await StudyGroup.findById(group._id)
      .populate('attachments.uploadedBy', 'studentId name');
    const newAtt = populated.attachments[populated.attachments.length - 1];
    res.status(201).json(newAtt);
  } catch (err) {
    console.error('PDF upload error:', err);
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ message: 'File too large (max 20 MB)' });
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/study-group/groups/:id/attachments ───────────────────────────────
router.get('/:id/attachments', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id)
      .populate('attachments.uploadedBy', 'studentId name');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group.attachments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/study-group/groups/:id/attachments/:attId ────────────────────
router.delete('/:id/attachments/:attId', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const att = group.attachments.id(req.params.attId);
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    const userId = req.user._id.toString();
    const isUploader = att.uploadedBy && att.uploadedBy.toString() === userId;
    const isLeader = group.leader.toString() === userId;
    if (!isUploader && !isLeader && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized to delete this attachment' });

    // Delete from disk
    const filePath = path.join(uploadsDir, att.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    att.deleteOne();
    await group.save();
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
