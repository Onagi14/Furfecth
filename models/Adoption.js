const mongoose = require("mongoose");

const adoptionSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" },
  petName: { type: String, required: true },
  petBreed: { type: String, required: true },
  petImage: { type: String },
  requesterName: { type: String, required: true },
  requesterDOB: { type: Date, required: true },
  requesterContact: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  requesterAddress: { type: String, required: true },
  experience: { type: String, required: true },
  timeWithPet: { type: String, required: true },
  livingSpace: { type: String, required: true },
  budget: { type: String, required: true },
  reason: { type: String, required: true },
  qualificationScore: { type: Number, default: 0 },
  recommendation: { type: String, default: "Pending Review" },
  requestDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending"
  }
});

module.exports = mongoose.model("Adoption", adoptionSchema);
