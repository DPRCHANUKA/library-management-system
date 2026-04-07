// controllers/bookingController.js

let bookings = []; // temporary (replace with DB later)

// GET all bookings
exports.getBookings = (req, res) => {
  res.json({ bookings });
};

// DELETE booking
exports.deleteBooking = (req, res) => {
  const id = req.params.id;

  bookings = bookings.filter(b => b.id != id);

  res.json({ message: "Booking deleted successfully" });
};

// UPDATE booking
exports.updateBooking = (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const index = bookings.findIndex(b => b.id == id);

  if (index === -1) {
    return res.status(404).json({ message: "Booking not found" });
  }

  bookings[index] = { ...bookings[index], ...updatedData };

  res.json({ message: "Booking updated successfully", booking: bookings[index] });
};