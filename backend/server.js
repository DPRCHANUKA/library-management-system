require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
const bookingRoutes = require("./routes/bookingRoutes");
const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const groupRoutes = require("./routes/studyGroupRoutes/groupRoutes");
const requestRoutes = require("./routes/studyGroupRoutes/requestRoutes");
const helpRoutes = require("./routes/studyGroupRoutes/helpRoutes");
const resourceRoutes = require("./routes/studyGroupRoutes/resourceRoutes");
const userRoutes = require("./routes/studyGroupRoutes/userRoutes");

app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/study-group/groups", groupRoutes);
app.use("/api/study-group/requests", requestRoutes);
app.use("/api/study-group/help", helpRoutes);
app.use("/api/study-group/resources", resourceRoutes);
app.use("/api/study-group/users", userRoutes);

app.get(/^\/study-group-app(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/study-group-app/index.html"));
});

// Test route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Optional SPA-style route
app.get("/pages/:page", (req, res) => {
  res.sendFile(path.join(__dirname, `../frontend/pages/${req.params.page}`));
});

// Seed default admin account
async function seedAdmin() {
  const User = require("./models/User");
  try {
    const existing = await User.findOne({ studentId: "ADMIN001" });
    if (!existing) {
      const admin = new User({
        studentId: "ADMIN001",
        name: "Administrator",
        password: "admin123",
        isAdmin: true
      });
      await admin.save();
      console.log("Default admin account created ✅ (ADMIN001 / admin123)");
    }
  } catch (err) {
    console.log("Admin seed skipped:", err.message);
  }
}

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
    seedAdmin();
  })
  .catch(err => console.log("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});