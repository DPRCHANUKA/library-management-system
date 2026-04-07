const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// GET all bookings
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

// GET check seat availability for a specific date and time
router.get("/check-availability", async (req, res) => {
  try {
    const { seat, date, fromTime, toTime } = req.query;
    
    // If checking single seat
    if (seat && date && fromTime && toTime) {
      const existingBooking = await Booking.findOne({
        seat: seat,
        date: date,
        $or: [
          // Check if time ranges overlap
          {
            fromTime: { $lt: toTime },
            toTime: { $gt: fromTime }
          }
        ]
      });
      
      return res.json({ 
        available: !existingBooking,
        message: existingBooking ? "Seat already booked for this time slot" : "Seat available"
      });
    }
    
    // Get all booked seats for a specific date and time range
    if (date && fromTime && toTime) {
      const bookedSeats = await Booking.find({
        date: date,
        $or: [
          {
            fromTime: { $lt: toTime },
            toTime: { $gt: fromTime }
          }
        ]
      });
      
      const bookedSeatNumbers = bookedSeats.flatMap(booking => booking.seat);
      
      return res.json({
        date: date,
        fromTime: fromTime,
        toTime: toTime,
        bookedSeats: bookedSeatNumbers,
        availableSeats: 32 - bookedSeatNumbers.length
      });
    }
    
    res.status(400).json({ message: "Missing parameters" });
  } catch (err) {
    console.error("Error checking availability:", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE booking with enhanced conflict checking
router.post("/", async (req, res) => {
  try {
    const { name, studentId, seat, date, fromTime, toTime } = req.body;
    
    // Validate input
    if (!name || !studentId || !seat || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Check for conflicts with ALL selected seats
    const conflictingBookings = await Booking.find({
      seat: { $in: seat }, // Check if any of the selected seats are booked
      date: date,
      $or: [
        {
          fromTime: { $lt: toTime },
          toTime: { $gt: fromTime }
        }
      ]
    });
    
    if (conflictingBookings.length > 0) {
      const conflictingSeats = conflictingBookings.flatMap(b => b.seat);
      return res.status(400).json({ 
        message: `Seat(s) ${conflictingSeats.join(", ")} already booked for this time slot!`,
        conflictingSeats: conflictingSeats
      });
    }
    
    const newBooking = new Booking({
      name,
      studentId,
      seat: seat,
      date,
      fromTime,
      toTime
    });
    
    await newBooking.save();
    
    res.json({ 
      message: "Booking saved successfully!",
      booking: newBooking
    });
    
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE booking
router.delete("/:id", async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE booking
router.put("/:id", async (req, res) => {
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings by student ID
router.get("/my-bookings/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    const bookings = await Booking.find({ 
      studentId: studentId,
      $or: [
        { date: { $gt: currentDate } }, // Future dates
        { 
          date: currentDate,
          toTime: { $gt: currentTime } // Today but not expired
        }
      ]
    }).sort({ date: 1, fromTime: 1 });
    
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;