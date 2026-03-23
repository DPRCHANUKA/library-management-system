const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// POST booking
router.post("/", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ message: "Booking saved", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings
router.get("/", async (req, res) => {
  const bookings = await Booking.find();
  res.json(bookings);
});

module.exports = router;