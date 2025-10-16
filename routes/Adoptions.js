const express = require("express");
const router = express.Router();
const Adoption = require("../models/Adoption");
const Pet = require("../models/Pet");
const nodemailer = require("nodemailer");
require("dotenv").config(); // Load .env variables

/**
 * POST adoption request (with worthiness assessment)
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
      experience,
      timeWithPet,
      livingSpace,
      budget,
      reason
    } = req.body;

    // Check required fields
    if (
      !petName || !petBreed || !requesterName || !requesterDOB ||
      !requesterContact || !requesterEmail || !requesterAddress ||
      !experience || !timeWithPet || !livingSpace || !budget || !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled out.",
      });
    }

    // 🧠 Worthiness scoring system
    let score = 0;
    if (experience === "yes") score += 25;
    if (timeWithPet === ">5") score += 25;
    else if (timeWithPet === "2-5") score += 15;
    if (livingSpace === "yes") score += 20;
    if (budget === ">5000") score += 20;
    else if (budget === "2000-5000") score += 10;
    if (reason.length >= 30) score += 10;

    // Recommendation logic
    let recommendation = "Needs Review";
    if (score >= 80) recommendation = "Highly Qualified";
    else if (score >= 60) recommendation = "Qualified";
    else if (score >= 40) recommendation = "May Need Assistance";
    else recommendation = "Not Qualified";

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
      requesterEmail: requesterEmail.toLowerCase(),
      requesterAddress,
      experience,
      timeWithPet,
      livingSpace,
      budget,
      reason,
      qualificationScore: score,
      recommendation,
      status: "pending"
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: "Adoption request submitted successfully!",
      score,
      recommendation
    });
  } catch (err) {
    console.error("❌ Error submitting adoption:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

/**
 * GET all adoption requests (admin view)
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
 * ✉️ Configure Nodemailer using environment variables
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * PATCH update adoption status (approve/decline) + send email
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    const adoption = await Adoption.findById(id).populate("petId");
    if (!adoption) {
      return res
        .status(404)
        .json({ success: false, message: "Adoption request not found." });
    }

    adoption.status = status;
    await adoption.save();

    const subject =
      status === "approved"
        ? "🎉 Adoption Request Approved!"
        : "❌ Adoption Request Declined";

    const message =
      status === "approved"
        ? `Hello ${adoption.requesterName},\n\nGood news! Your request to adopt ${adoption.petId?.name || adoption.petName} has been APPROVED.\nWe will contact you with further details.\n\nThank you,\nFurFect Match`
        : `Hello ${adoption.requesterName},\n\nUnfortunately, your request to adopt ${adoption.petId?.name || adoption.petName} has been DECLINED.\n\nThank you for understanding,\nFurFect Match`;

    await transporter.sendMail({
      from: `"FurFect Match Admin" <${process.env.EMAIL_USER}>`,
      to: adoption.requesterEmail,
      subject,
      text: message,
    });

    res.json({ success: true, message: `Request ${status} and email sent.` });
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
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

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
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const adoptions = await Adoption.find({
      requesterEmail: email.toLowerCase(),
      status: "approved",
    })
      .populate("petId")
      .sort({ requestDate: -1 });

    const pets = adoptions.map((adoption) => {
      const pet = adoption.petId;
      return {
        petName: pet?.name || adoption.petName || "Unknown Pet",
        petBreed: pet?.breed || adoption.petBreed || "Unknown Breed",
        requestDate: adoption.requestDate,
        petImage: pet?.image?.data
          ? `data:${pet.image.contentType};base64,${pet.image.data.toString("base64")}`
          : adoption.petImage || "/images/pet.jpg",
        worthinessScore: adoption.worthinessScore,
      };
    });

    res.json({ success: true, pets });
  } catch (err) {
    console.error("❌ Error fetching adopted pets:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET total approved adoptions count (admin)
 */
router.get("/count/approved", async (req, res) => {
  try {
    const count = await Adoption.countDocuments({ status: "approved" });
    res.json({ success: true, totalApproved: count });
  } catch (err) {
    console.error("❌ Error counting approved adoptions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * DELETE adoption request
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequest = await Adoption.findByIdAndDelete(id);

    if (!deletedRequest)
      return res
        .status(404)
        .json({ success: false, message: "Adoption request not found." });

    res.json({ success: true, message: "Adoption request deleted." });
  } catch (err) {
    console.error("❌ Error deleting request:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
