const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // Dog/Cat
  breed: { type: String, required: true }, // ✅ breed
  description: { type: String, required: true },
  image: { data: Buffer, contentType: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Pet", petSchema);
