const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Book = require("../models/Book");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../frontend/images");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// GET all books
router.get("/", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add a new book (with image upload)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { name, genre } = req.body;
    if (!name || !genre) {
      return res.status(400).json({ error: "Book name and genre are required" });
    }
    const image = req.file ? req.file.filename : "book1.jpg";
    const book = new Book({ name, genre, image });
    await book.save();
    res.status(201).json({ message: "Book added successfully", book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a book
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // Remove from all users' wishlists and borrowed books
    await User.updateMany(
      {},
      {
        $pull: {
          wishlist: book._id,
          borrowedBooks: { bookId: book._id }
        }
      }
    );

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST book a book
router.post("/:id/book", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.borrowedBooks.length >= 3) {
      return res.status(400).json({ error: "You already have 3 books borrowed. Please return a book first." });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!book.isAvailable) return res.status(400).json({ error: "Book is already booked" });

    const bookedDate = new Date();
    const returnDate = new Date(bookedDate);
    returnDate.setDate(returnDate.getDate() + 7);

    book.isAvailable = false;
    book.bookedBy = user._id;
    book.bookerName = user.name;
    book.bookedDate = bookedDate;
    book.returnDate = returnDate;
    await book.save();

    user.borrowedBooks.push({ bookId: book._id, bookedDate, returnDate });
    // Remove from wishlist if present
    user.wishlist = user.wishlist.filter(wId => wId.toString() !== book._id.toString());
    await user.save();

    res.json({ message: "Book Booked!", book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST return a book
router.post("/:id/return", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.isAvailable = true;
    book.bookedBy = null;
    book.bookerName = null;
    book.bookedDate = null;
    book.returnDate = null;
    await book.save();

    user.borrowedBooks = user.borrowedBooks.filter(
      b => b.bookId.toString() !== book._id.toString()
    );
    await user.save();

    res.json({ message: "Book returned successfully", book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add to wishlist
router.post("/:id/wishlist", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const bookId = req.params.id;
    if (user.wishlist.some(w => w.toString() === bookId)) {
      return res.status(400).json({ error: "Book already in wishlist" });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    user.wishlist.push(bookId);
    await user.save();

    res.json({ message: "Added to Wishlist!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove from wishlist
router.delete("/:id/wishlist", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.wishlist = user.wishlist.filter(w => w.toString() !== req.params.id);
    await user.save();

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST book from wishlist
router.post("/:id/wishlist/book", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.borrowedBooks.length >= 3) {
      return res.status(400).json({ error: "You already have 3 books borrowed. Please return a book first." });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!book.isAvailable) return res.status(400).json({ error: "Book is already booked by someone else" });

    const bookedDate = new Date();
    const returnDate = new Date(bookedDate);
    returnDate.setDate(returnDate.getDate() + 7);

    book.isAvailable = false;
    book.bookedBy = user._id;
    book.bookerName = user.name;
    book.bookedDate = bookedDate;
    book.returnDate = returnDate;
    await book.save();

    user.borrowedBooks.push({ bookId: book._id, bookedDate, returnDate });
    user.wishlist = user.wishlist.filter(w => w.toString() !== book._id.toString());
    await user.save();

    res.json({ message: "Book Booked!", book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
