const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  seat: String
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);