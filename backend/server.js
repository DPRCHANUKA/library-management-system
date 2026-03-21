require("dotenv").config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const bookingRoutes = require("./routes/bookingRoutes");
app.use("/api/bookings", bookingRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));




// start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});