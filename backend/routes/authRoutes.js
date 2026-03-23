const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Sign Up
router.post("/signup", async (req, res) => {
  try {
    const { studentId, name, password } = req.body;
    if (!studentId || !name || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Student ID validation: exactly 10 alphanumeric characters
    if (!/^[A-Za-z0-9]{10}$/.test(studentId)) {
      return res.status(400).json({ error: "Student ID must be exactly 10 alphanumeric characters" });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least 1 uppercase letter" });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least 1 lowercase letter" });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least 1 number" });
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least 1 special character (!@#$%^&*)" });
    }

    const existingUser = await User.findOne({ studentId });
    if (existingUser) {
      return res.status(400).json({ error: "Student ID already exists" });
    }

    const user = new User({ studentId, name, password });
    await user.save();
    res.status(201).json({ message: "Account created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if Student ID exists (for real-time validation)
router.get("/check-id/:studentId", async (req, res) => {
  try {
    const existing = await User.findOne({ studentId: req.params.studentId });
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign In
router.post("/signin", async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findOne({ studentId });
    if (!user) {
      return res.status(400).json({ error: "Invalid Student ID or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid Student ID or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user._id, studentId: user.studentId, name: user.name, isAdmin: user.isAdmin }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate("borrowedBooks.bookId")
      .populate("wishlist");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user shelf (borrowed + wishlist)
router.get("/shelf", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("borrowedBooks wishlist name studentId")
      .populate("borrowedBooks.bookId")
      .populate("wishlist");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      borrowedBooks: user.borrowedBooks,
      wishlist: user.wishlist,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
