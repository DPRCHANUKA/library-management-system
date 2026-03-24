const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// GET all bookings - ADD THIS ENDPOINT
router.get("/", async (req, res) => {
  try {
    console.log("📊 Fetching all bookings");
    const bookings = await Booking.find().sort({ createdAt: -1 });
    
    res.json({
      message: "Bookings fetched successfully",
      count: bookings.length,
      bookings: bookings
    });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE booking
router.post("/", async (req, res) => {
  try {
    const { name, studentId, seat, date, fromTime, toTime } = req.body;

    // prevent double booking
    const existing = await Booking.findOne({ seat, date, fromTime, toTime });

    if (existing) {
      return res.status(400).json({ message: "Seat already booked!" });
    }

    const newBooking = new Booking({
      name,
      studentId,
      seat,
      date,
      fromTime,
      toTime
    });

    await newBooking.save();

    res.json({ message: "Booking saved!" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;