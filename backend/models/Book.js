const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: { type: String, required: true },
  image: { type: String, default: "book1.jpg" },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  bookerName: { type: String, default: null },
  bookedDate: { type: Date, default: null },
  returnDate: { type: Date, default: null },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);
