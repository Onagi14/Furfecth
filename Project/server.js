const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");


const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Multer config (to handle image upload)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/furfectmatch", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  profileImage: { data: Buffer, contentType: String },
  pet: {
    type: {
      type: String, // cat or dog
      default: null
    },
    level: { type: Number, default: 1 },
    hunger: { type: Number, default: 100 },
    energy: { type: Number, default: 100 },
    exp: { type: Number, default: 0 }
  }
});


const User = mongoose.model("User", userSchema);

// Signup route with image upload
app.post("/signup", upload.single("profileImage"), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      profileImage: req.file
        ? { data: req.file.buffer, contentType: req.file.mimetype }
        : null,
    });

    await newUser.save();
    res.status(201).json({ success: true, message: "User registered successfully!" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password!" });
    }

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get user info (with image or default)
app.get("/api/user", async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let profileImage = null;
    if (user.profileImage) {
      profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString("base64")}`;
    } else {
      // Default profile pic (FB-like avatar)
      profileImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }

    res.json({
      success: true,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: profileImage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Upload or update profile picture
app.post("/api/upload-profile", upload.single("profileImage"), async (req, res) => {
  try {
    const { email } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.profileImage = { data: req.file.buffer, contentType: req.file.mimetype };
    await user.save();

    const profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString("base64")}`;

    res.json({ success: true, message: "Profile updated!", profileImage });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});



// Save pet state (create or update)
app.post("/api/save-pet", async (req, res) => {
  const { email, pet } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { pet } },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Pet saved!", pet: user.pet });
  } catch (err) {
    console.error("Save pet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get pet state
app.get("/api/get-pet", async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, pet: user.pet });
  } catch (err) {
    console.error("Get pet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



const petsRoutes = require('./routes/Pets');
app.use('/api/pets', petsRoutes);

const adoptionRoutes = require('./routes/Adoptions');
app.use('/api/adoptions', adoptionRoutes);



// Start server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
