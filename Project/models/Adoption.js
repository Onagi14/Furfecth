const mongoose = require("mongoose"); // ✅ Import mongoose
const adoptionSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" }, // ✅ link to Pet
  petName: { type: String, required: true },
  petBreed: { type: String, required: true },
  petImage: { type: String }, // ✅ base64 snapshot of pet’s image
  requesterName: { type: String, required: true },
  requesterDOB: { type: Date, required: true },
  requesterContact: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  requesterAddress: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending"
  }
});


module.exports = mongoose.model('Adoption', adoptionSchema);
