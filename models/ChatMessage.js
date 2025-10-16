// models/ChatMessage.js
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sender: String,
  name: String,
  profile: String,
  message: String,
  image: {
    data: Buffer,
    contentType: String
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
