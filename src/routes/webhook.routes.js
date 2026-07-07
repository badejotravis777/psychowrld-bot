const express = require("express");
const router = express.Router();
const { verifyWebhook, handleIncomingMessage } = require("../controllers/webhook.controller");

// Meta webhook verification
router.get("/", verifyWebhook);

// Incoming messages
router.post("/", handleIncomingMessage);

module.exports = router;
