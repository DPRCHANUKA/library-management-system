const express = require('express');
const RequestModel = require('../../models/Request');
const StudyGroup = require('../../models/StudyGroup');
const User = require('../../models/User');
const protect = require('../../middleware/authMiddleware');

const router = express.Router();

// GET my requests
router.get('/my', protect, async (req, res) => {
  try {
    // Both join and create requests
    const requests = await RequestModel.find({ user: req.user.id }).populate('group', 'title module').populate('user', 'name');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all requests (for admin)
router.get('/', protect, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const type = req.query.type;
    const query = { status: 'Pending' };
    if (type) query.type = type;
    const requests = await RequestModel.find(query).populate('user', 'name email').populate('group', 'title');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// APPROVE request (create group or join group)
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const request = await RequestModel.findById(req.params.id).populate('user', '_id name email');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const requestUserId = request.user?._id || request.user;
    if (!requestUserId) {
      return res.status(400).json({ message: 'Request does not have a valid user attached' });
    }

    if (request.type === 'Create Group') {
      const memberEntries = Array.isArray(request.members) && request.members.length > 0
        ? request.members
        : [
            { name: request.leaderName, itNumber: request.leaderId },
            { name: request.member2Name, itNumber: request.member2Id },
            { name: request.member3Name, itNumber: request.member3Id },
            { name: request.member4Name, itNumber: request.member4Id },
            { name: request.member5Name, itNumber: request.member5Id },
          ].filter((m) => m.name || m.itNumber);

      const memberItNumbers = memberEntries
        .map((m) => m.itNumber)
        .filter(Boolean)
        .map((it) => it.trim())
        .filter(Boolean);

      const matchedUsers = await User.find({ email: { $in: memberItNumbers } }).select('_id email');
      const emailToId = matchedUsers.reduce((acc, u) => {
        acc[u.email] = u._id;
        return acc;
      }, {});

      const leaderEntry = memberEntries[0] || {};
      const leaderId = emailToId[leaderEntry.itNumber?.trim()] || requestUserId;
      const memberIds = [leaderId];

      memberEntries.slice(1).forEach((member) => {
        const normalized = member.itNumber?.trim();
        const matched = normalized ? emailToId[normalized] : null;
        if (matched && !memberIds.some((m) => m.toString() === matched.toString())) {
          memberIds.push(matched);
        }
      });

      if (!memberIds.some((m) => m.toString() === requestUserId.toString())) {
        memberIds.push(requestUserId);
      }

      const group = await StudyGroup.create({
        title: request.title,
        module: request.module,
        path: request.path,
        isPrivate: request.isPrivate,
        maxMembers: request.maxMembers,
        leader: leaderId,
        members: memberIds,
        pendingRequests: []
      });
      
      request.status = 'Approved';
      await request.save();
      res.json({ message: 'Group created', group });
    } else if (request.type === 'Join Group') {
      const group = await StudyGroup.findById(request.group);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      if (!group.members.includes(requestUserId)) {
        group.members.push(requestUserId);
        if (group.pendingRequests?.includes(requestUserId)) {
          group.pendingRequests.remove(requestUserId);
        }
        await group.save();
      }

      request.status = 'Approved';
      await request.save();
      res.json({ message: 'User added to group' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REJECT request
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const request = await RequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    request.status = 'Rejected';
    await request.save();
    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a request
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await RequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.user.toString() !== req.user.id.toString()) {
       return res.status(403).json({ message: 'Not authorized to delete this request' });
    }
    await request.deleteOne();
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE a request
router.put('/:id', protect, async (req, res) => {
  try {
    const request = await RequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.user.toString() !== req.user.id.toString()) {
       return res.status(403).json({ message: 'Not authorized to update this request' });
    }
    
    const { title, module, path, isPrivate, maxMembers, members, description } = req.body;
    
    request.title = title;
    request.module = module;
    request.path = path;
    request.isPrivate = isPrivate;
    request.maxMembers = maxMembers;
    request.members = Array.isArray(members) ? members : request.members;
    request.description = description;
    
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
