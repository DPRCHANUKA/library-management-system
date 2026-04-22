const express = require('express');
const User = require('../../models/User');
const protect = require('../../middleware/authMiddleware');

const router = express.Router();

// GET all seniors
router.get('/seniors', protect, async (req, res) => {
  try {
    const seniors = await User.find({ isSenior: true }).select('name email module role');
    res.json(seniors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET seniors by module
router.get('/seniors/:module', protect, async (req, res) => {
  try {
    const seniors = await User.find({ isSenior: true, module: req.params.module }).select('name email module role');
    res.json(seniors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Create a new senior
router.post('/seniors', protect, async (req, res) => {
  try {
    const { name, email, module } = req.body;

    if (!name || !email || !module) {
      return res.status(400).json({ message: 'Name, email, and module are required' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      user.name = name;
      user.module = module;
      user.isSenior = true;
      user.role = 'senior';
      await user.save();
    } else {
      // Create a new user with default password
      user = new User({
        name,
        email,
        password: 'defaultSeniorPassword123', // Will be hashed by middleware
        module,
        isSenior: true,
        role: 'senior'
      });
      await user.save();
    }

    res.status(201).json({ 
      message: 'Senior created/updated successfully',
      user: user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Remove a senior
router.delete('/seniors/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Senior not found' });
    }

    user.isSenior = false;
    user.role = 'student';
    user.module = null;
    await user.save();

    res.json({ message: 'Senior removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
