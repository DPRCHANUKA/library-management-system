const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  studentId: String,
  seat: [String],
  date: String,
  fromTime: String,
  toTime: String  
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);