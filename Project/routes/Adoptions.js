const express = require("express");
const router = express.Router();
const Adoption = require("../models/Adoption");
const Pet = require("../models/Pet");

/**
 * POST adoption request
 */
router.post("/request", async (req, res) => {
  try {
    const {
      petName,
      petBreed,
      requesterName,
      requesterDOB,
      requesterContact,
      requesterEmail,
      requesterAddress,
    } = req.body;

    if (
      !petName ||
      !petBreed ||
      !requesterName ||
      !requesterDOB ||
      !requesterContact ||
      !requesterEmail ||
      !requesterAddress
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required!" });
    }

    const pet = await Pet.findOne({ name: petName, breed: petBreed });

    const newRequest = new Adoption({
      petId: pet ? pet._id : undefined,
      petName,
      petBreed,
      petImage: pet?.image?.data
        ? `data:${pet.image.contentType};base64,${pet.image.data.toString("base64")}`
        : null,
      requesterName,
      requesterDOB,
      requesterContact,
      requesterEmail: requesterEmail.toLowerCase(), // ✅ normalize email
      requesterAddress,
      status: "pending",
    });

    await newRequest.save();
    res.status(201).json({ success: true, message: "Adoption request submitted!" });

  } catch (err) {
    console.error("❌ Error submitting adoption:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * GET all adoption requests (admin only)
 */
router.get("/all", async (req, res) => {
  try {
    const requests = await Adoption.find().sort({ requestDate: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Error fetching all requests:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * PATCH update adoption status (approve/decline)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const updatedRequest = await Adoption.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Adoption request not found." });
    }

    res.json({ success: true, message: "Status updated successfully.", request: updatedRequest });

  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET adoption requests by user
 */
router.get("/user", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const requests = await Adoption.find({
      requesterEmail: email.toLowerCase(),
    }).sort({ requestDate: -1 });

    res.json({ success: true, requests });

  } catch (err) {
    console.error("❌ Error fetching user requests:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET adopted pets (approved requests only) by user
 */
router.get("/user/adopted", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const adoptions = await Adoption.find({
      requesterEmail: email.toLowerCase(),
      status: "approved",
    })
      .populate("petId")
      .sort({ requestDate: -1 });

    console.log(`📌 Adopted pets fetched for ${email}: ${adoptions.length}`);

    const pets = adoptions.map(adoption => {
      const pet = adoption.petId;
      return {
        petName: pet?.name || adoption.petName || "Unknown Pet",
        petBreed: pet?.breed || adoption.petBreed || "Unknown Breed",
        requestDate: adoption.requestDate,
        petImage: pet?.image?.data
          ? `data:${pet.image.contentType};base64,${pet.image.data.toString("base64")}`
          : adoption.petImage || "/images/pet.jpg",
      };
    });

    res.json({ success: true, pets });

  } catch (err) {
    console.error("❌ Error fetching adopted pets:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET total adopted pets (admin quick counter)
 */
router.get("/count/approved", async (req, res) => {
  try {
    const count = await Adoption.countDocuments({ status: "approved" });
    console.log(`📊 Total approved adoptions: ${count}`);
    res.json({ success: true, totalApproved: count });
  } catch (err) {
    console.error("❌ Error counting approved adoptions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * DELETE adoption request (admin only)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequest = await Adoption.findByIdAndDelete(id);

    if (!deletedRequest) return res.status(404).json({ success: false, message: "Adoption request not found." });

    res.json({ success: true, message: "Adoption request deleted." });
  } catch (err) {
    console.error("❌ Error deleting request:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
