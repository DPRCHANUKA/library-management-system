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
    const { seat, date, fromTime, toTime, excludeBookingId } = req.query;
    
    console.log("Check availability params:", { seat, date, fromTime, toTime, excludeBookingId });
    
    // If checking single seat
    if (seat && date && fromTime && toTime) {
      // Build query - exclude the current booking if editing
      let query = {
        seat: seat,
        date: date,
        $or: [
          {
            fromTime: { $lt: toTime },
            toTime: { $gt: fromTime }
          }
        ]
      };
      
      // If excludeBookingId is provided, exclude that booking from conflict check
      if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
      }
      
      const existingBooking = await Booking.findOne(query);
      
      console.log("Existing booking found:", existingBooking);
      
      return res.json({ 
        available: !existingBooking,
        conflictingBookingId: existingBooking ? existingBooking._id : null,
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
      
      const bookedSeatNumbers = bookedSeats.flatMap(booking => 
        Array.isArray(booking.seat) ? booking.seat : [booking.seat]
      );
      
      return res.json({
        date: date,
        fromTime: fromTime,
        toTime: toTime,
        bookedSeats: [...new Set(bookedSeatNumbers)],
        availableSeats: 32 - new Set(bookedSeatNumbers).size
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
      seat: { $in: seat },
      date: date,
      $or: [
        {
          fromTime: { $lt: toTime },
          toTime: { $gt: fromTime }
        }
      ]
    });
    
    if (conflictingBookings.length > 0) {
      const conflictingSeats = conflictingBookings.flatMap(b => 
        Array.isArray(b.seat) ? b.seat : [b.seat]
      );
      return res.status(400).json({ 
        message: `Seat(s) ${[...new Set(conflictingSeats)].join(", ")} already booked for this time slot!`,
        conflictingSeats: [...new Set(conflictingSeats)]
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

// UPDATE booking with proper conflict checking
router.put("/:id", async (req, res) => {
  try {
    const { seat, date, fromTime, toTime } = req.body;
    const bookingId = req.params.id;
    
    console.log("Updating booking:", { bookingId, seat, date, fromTime, toTime });
    
    // Check for conflicts with OTHER bookings (excluding this one)
    const conflictingBookings = await Booking.find({
      _id: { $ne: bookingId }, // Exclude current booking
      seat: { $in: seat }, // Check all seats in the booking
      date: date,
      $or: [
        {
          fromTime: { $lt: toTime },
          toTime: { $gt: fromTime }
        }
      ]
    });
    
    console.log("Conflicting bookings found:", conflictingBookings.length);
    
    if (conflictingBookings.length > 0) {
      const conflictingSeats = conflictingBookings.flatMap(b => 
        Array.isArray(b.seat) ? b.seat : [b.seat]
      );
      return res.status(400).json({ 
        message: `Seat(s) ${[...new Set(conflictingSeats)].join(", ")} already booked for this time slot!`,
        conflictingSeats: [...new Set(conflictingSeats)]
      });
    }
    
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      req.body,
      { new: true }
    );
    
    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking
    });
  } catch (err) {
    console.error("Error updating booking:", err);
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
        { date: { $gt: currentDate } },
        { 
          date: currentDate,
          toTime: { $gt: currentTime }
        }
      ]
    }).sort({ date: 1, fromTime: 1 });
    
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;