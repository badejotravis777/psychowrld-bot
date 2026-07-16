const express = require("express");
const router = express.Router();
const { sendText } = require("../services/whatsapp.service");
const Session = require("../models/session.model");
const { sendWelcomeMenu } = require("../services/menu.service");

const checkInternalSecret = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Admin dashboard asks us to deliver an agent's reply on WhatsApp
router.post("/send", checkInternalSecret, async (req, res) => {
  try {
    const { customerNumber, text } = req.body;
    if (!customerNumber || !text) return res.status(400).json({ error: "customerNumber and text required" });

    await sendText(customerNumber, text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard tells us a session ended — release the customer back to the bot menu
router.post("/end", checkInternalSecret, async (req, res) => {
  try {
    const { customerNumber } = req.body;
    if (!customerNumber) return res.status(400).json({ error: "customerNumber required" });

    let session = await Session.findOne({ waNumber: customerNumber });
    if (!session) return res.json({ success: true });

    session.agentMode = false;
    await session.save();

    await sendText(customerNumber, "✅ *Session ended.* Thanks for chatting with our team!\n\nHere's the main menu again:");
    await sendWelcomeMenu(customerNumber, session);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;