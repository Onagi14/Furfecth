const express = require("express");
const multer = require("multer");
const Pet = require("../models/Pet");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * ✅ Admin Upload Pet
 */
router.post("/upload-pet", upload.single("petImage"), async (req, res) => {
  try {
    const { name, type, breed, description } = req.body;

    if (!name || !type || !breed || !description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Pet image required" });
    }

    const newPet = new Pet({
      name,
      type,
      breed,
      description,
      image: { data: req.file.buffer, contentType: req.file.mimetype }
    });

    await newPet.save();
    res.json({ success: true, message: "Pet uploaded successfully!" });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * ✅ Fetch Pets for Users (Adoption Center)
 */
router.get("/get-pets", async (req, res) => {
  try {
    const pets = await Pet.find();
    const formattedPets = pets.map(pet => ({
      id: pet._id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      description: pet.description,
      image: `data:${pet.image.contentType};base64,${pet.image.data.toString("base64")}`
    }));

    res.json({ success: true, pets: formattedPets });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * ✅ Fetch All Pets (Admin Dashboard)
 */
router.get("/all", async (req, res) => {
  try {
    const pets = await Pet.find().sort({ createdAt: -1 });
    const formattedPets = pets.map(pet => ({
      id: pet._id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      description: pet.description,
      image: `data:${pet.image.contentType};base64,${pet.image.data.toString("base64")}`
    }));

    res.json({ success: true, pets: formattedPets });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * ✅ Delete Pet by ID (Admin Only)
 */
// ✅ Delete Pet by ID
router.delete("/delete-pet/:id", async (req, res) => {
  try {
    const pet = await Pet.findByIdAndDelete(req.params.id);
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found" });
    res.json({ success: true, message: "Pet deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});


module.exports = router;
