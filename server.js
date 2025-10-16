const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();


// ✅ Models
const ChatMessage = require("./models/ChatMessage");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your frontend URL if hosted
    methods: ["GET", "POST"],
  },
});

const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });






// ✅ Serve static files from both folders
app.use(express.static(path.join(__dirname, "LandingPage")));
app.use(express.static(path.join(__dirname, "Content")));

// ✅ Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "LandingPage", "landingpage.html"));
});

// ✅ MongoDB connection
mongoose
  .connect("mongodb+srv://Furfecth:GoL9wi9bgpvppmiv@cluster0.s8s9fru.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  profileImage: { data: Buffer, contentType: String },
  pet: {
    name: { type: String, default: "My Pet" },
    type: { type: String, default: null },
    level: { type: Number, default: 1 },
    hunger: { type: Number, default: 100 },
    energy: { type: Number, default: 100 },
    exp: { type: Number, default: 0 },
  },
});

const User = mongoose.model("User", userSchema);

//
// 🧠 AUTHENTICATION ROUTES
//
app.post("/signup", upload.single("profileImage"), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "Email already registered!" });

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
    res
      .status(201)
      .json({ success: true, message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password!" });

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
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

//
// 🧠 USER PROFILE ROUTES
//
app.get("/api/user", async (req, res) => {
  try {
    const { email } = req.query;
    console.log("Fetching user for email:", email);

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    let profileImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    if (user.profileImage && user.profileImage.data) {
      profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString(
        "base64"
      )}`;
    }

    res.json({
      success: true,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: profileImage,
    });
  } catch (err) {
    console.error("Error in /api/user:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});



// ✅ Count all users
app.get("/api/users/count", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    console.error("Error counting users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/upload-profile", upload.single("profileImage"), async (req, res) => {
  try {
    const { email } = req.body;
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.profileImage = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };
    await user.save();

    const profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString(
      "base64"
    )}`;
    res.json({ success: true, message: "Profile updated!", profileImage });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

//
// 🧠 PET MANAGEMENT ROUTES
//
app.post("/api/save-pet", async (req, res) => {
  const { email, pet } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: "email required" });
  if (!pet || !pet.type)
    return res
      .status(400)
      .json({ success: false, message: "pet.type required" });

  try {
    await User.updateOne({ email }, { $set: { pet } });
    console.log(`🐾 User ${email} adopted a pet: ${pet.type}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "server error" });
  }
});

app.get("/api/get-pet", async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, pet: user.pet || null });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//
// 🧠 EMAIL CONTACT ROUTE
//
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "celestrialioraeth@gmail.com",
        pass: "rdjv wese tqlu docu", // ⚠️ app password, not real Gmail password
      },
    });

    const mailOptions = {
      from: email,
      to: "celestrialioraeth@gmail.com",
      subject: `New Contact Form Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Message sent successfully!" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send message." });
  }
});

//
// 🐾 IMPORT ROUTES
//
const petsRoutes = require("./routes/Pets");
app.use("/api/pets", petsRoutes);

const adoptionRoutes = require("./routes/Adoptions");
app.use("/api/adoptions", adoptionRoutes);

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => {
      let imageData = null;
      if (msg.image && msg.image.data) {
        const base64 = msg.image.data.toString("base64");
        imageData = `data:${msg.image.contentType};base64,${base64}`;
      }

      let profileImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
      if (msg.profile && msg.profile.startsWith("data:")) {
        profileImage = msg.profile;
      }

      return {
        sender: msg.sender,
        name: msg.name,
        profile: profileImage,
        message: msg.message,
        image: imageData, // ✅ Include image here
        timestamp: msg.timestamp,
      };
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error("❌ Failed to load messages:", error);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

//
// 💬 COMMUNITY CHAT SYSTEM
//
io.on("connection", (socket) => {
  console.log("💬 User connected to chat:", socket.id);

  socket.on("chatMessage", async (msg) => {
    try {
      const user = await User.findOne({ email: msg.sender });
      let profileImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

      if (user && user.profileImage?.data) {
        profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString("base64")}`;
      }

      const messageData = {
        sender: msg.sender,
        name: user ? `${user.firstName} ${user.lastName || ""}` : "Anonymous",
        profile: profileImage,
        message: msg.message || "",
        timestamp: new Date(),
      };

      if (msg.image) {
        const base64Data = msg.image.split(",")[1];
        messageData.image = {
          data: Buffer.from(base64Data, "base64"),
          contentType: msg.image.split(";")[0].split(":")[1],
        };
      }

      const savedMsg = await new ChatMessage(messageData).save();

      // ✅ Convert before emitting
      let finalMessage = {
        sender: savedMsg.sender,
        name: savedMsg.name,
        profile: savedMsg.profile,
        message: savedMsg.message,
        timestamp: savedMsg.timestamp,
      };

      if (savedMsg.image?.data) {
        finalMessage.image = `data:${savedMsg.image.contentType};base64,${savedMsg.image.data.toString("base64")}`;
      }

      io.emit("chatMessage", finalMessage);
    } catch (error) {
      console.error("Chat message error:", error);
    }
  });
});



//
// 🚀 Start server
//
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
