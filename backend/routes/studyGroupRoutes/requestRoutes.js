const express = require('express');
const router = express.Router();
const Request = require('../../models/Request');
const StudyGroup = require('../../models/StudyGroup');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/study-group/requests — all requests (admin)
router.get('/', protect, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('user', 'studentId name')
      .populate('group', 'title module');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/study-group/requests/my — requests by the logged-in user
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .populate('group', 'title module');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/study-group/requests — create a new request
router.post('/', protect, async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    const request = new Request(data);
    const saved = await request.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/study-group/requests/:id — approve or reject (admin/leader)
router.put('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const { status } = req.body;
    request.status = status;

    // If approved and it's a Join Group request, add member
    if (status === 'Approved' && request.type === 'Join Group' && request.group) {
      const group = await StudyGroup.findById(request.group);
      if (group && !group.members.map(m => m.toString()).includes(request.user.toString())) {
        group.members.push(request.user);
        group.pendingRequests = group.pendingRequests.filter(u => u.toString() !== request.user.toString());
        await group.save();
      }
    }

    // If approved and it's a Create Group request, create the group
    if (status === 'Approved' && request.type === 'Create Group') {
      const existing = await StudyGroup.findOne({ title: request.title });
      if (!existing) {
        const group = new StudyGroup({
          title: request.title,
          module: request.module,
          path: request.path || request.module,
          isPrivate: request.isPrivate || false,
          maxMembers: request.maxMembers || 10,
          leader: request.user,
          members: [request.user],
        });
        await group.save();
      }
    }

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/study-group/requests/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.user.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: 'Not authorized' });
    await request.deleteOne();
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
