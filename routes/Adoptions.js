const express = require("express");
const router = express.Router();
const Adoption = require("../models/Adoption");
const Pet = require("../models/Pet");
const nodemailer = require("nodemailer");
require("dotenv").config(); // ✅ Load .env variables

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

    // 🧠 Worthiness scoring
    let score = 0;
    if (experience === "yes") score += 25;
    if (timeWithPet === ">5") score += 25;
    else if (timeWithPet === "2-5") score += 15;
    if (livingSpace === "yes") score += 20;
    if (budget === ">5000") score += 20;
    else if (budget === "2000-5000") score += 10;
    if (reason.length >= 30) score += 10;

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
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ✉️ Configure Nodemailer using .env
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
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
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const adoption = await Adoption.findById(id).populate("petId");
    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption request not found." });
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

    console.log("📨 Attempting to send email to:", adoption.requesterEmail);
    console.log("📤 Subject:", subject);

    const info = await transporter.sendMail({
      from: `"FurFect Match Admin" <${process.env.EMAIL_USER}>`,
      to: adoption.requesterEmail,
      subject,
      text: message,
    });

    console.log("✅ Email sent successfully!");
    console.log("📧 Message ID:", info.messageId);

    res.json({ success: true, message: `Request ${status} and email sent.` });

  } catch (err) {
    console.error("❌ Error updating status:", err);
    console.error("💥 Email send error:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * 🧾 GET all adoption requests (for Reports page)
 */
router.get("/all", async (req, res) => {
  try {
    const adoptions = await Adoption.find().sort({ createdAt: -1 });
    res.json({ success: true, requests: adoptions });
  } catch (err) {
    console.error("❌ Error fetching adoption reports:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
