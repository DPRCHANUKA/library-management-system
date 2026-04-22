const express = require('express');
const StudyGroup = require('../../models/StudyGroup');
const RequestModel = require('../../models/Request');
const User = require('../../models/User');
const protect = require('../../middleware/authMiddleware');

const router = express.Router();

// GET all groups (with search/filter possible)
router.get('/', protect, async (req, res) => {
  try {
    const groups = await StudyGroup.find({})
      .populate('leader', 'name email')
      .populate('members', 'name email');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create group (can be direct, or a request if user is not admin and requires approval, but let's implement the direct/request hybrid based on frontend)
router.post('/', protect, async (req, res) => {
  const { title, module, path, maxMembers, isPrivate, directCreate, description, members } = req.body;
  try {
    if (directCreate) {
      const group = await StudyGroup.create({
        title, module, path, maxMembers, isPrivate, leader: req.user.id, members: [req.user.id]
      });
      res.status(201).json(group);
    } else {
      // Create a request with a dynamic member list
      const request = await RequestModel.create({
        user: req.user.id,
        type: 'Create Group',
        title,
        module,
        path,
        maxMembers,
        isPrivate,
        members: Array.isArray(members) ? members : [],
        description,
        status: 'Pending'
      });
      res.status(201).json(request);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// JOIN Group
router.post('/:id/join', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.isPrivate) {
      // Submit a join request
      const request = await RequestModel.create({
        user: req.user.id,
        type: 'Join Group',
        group: group._id,
        status: 'Pending'
      });
      res.json({ message: 'Join request submitted', request });
    } else {
      // Direct join
      if (!group.members.includes(req.user.id)) {
        group.members.push(req.user.id);
        await group.save();
      }
      res.json({ message: 'Joined successfully', group });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LEAVE Group
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    group.members = group.members.filter(memberId => memberId.toString() !== req.user.id.toString());
    await group.save();
    res.json({ message: 'Left group successfully', group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DISBAND Group (also allow admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    const user = await User.findById(req.user.id);
    const isLeader = group.leader.toString() === req.user.id.toString();
    const isAdmin = user.role === 'admin';

    if (!isLeader && !isAdmin) {
       return res.status(403).json({ message: 'Not authorized to delete this group' });
    }
    
    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// KICK member from group (admin only)
router.post('/:id/kick', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const group = await StudyGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    const { memberId } = req.body;
    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();
    
    res.json({ message: 'Member removed from group' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
