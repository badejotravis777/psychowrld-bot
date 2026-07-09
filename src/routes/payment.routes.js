const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../models/order.model");
const { verifyPayment } = require("../services/payment.service");
const { sendText, sendButtons } = require("../services/whatsapp.service");

// Paystack webhook — called automatically when payment is made
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body);

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const orderId = metadata?.orderId;
      const customerPhone = metadata?.customerPhone;

      if (!orderId) return res.sendStatus(200);

      // Update order in DB
      const order = await Order.findOneAndUpdate(
        { orderId },
        { paymentStatus: "paid", status: "paid", paymentRef: reference },
        { new: true }
      );

      if (order && customerPhone) {
        // Notify customer
        await sendButtons(
          customerPhone,
          `🎉 *Payment Confirmed!*\n\n` +
            `Order ID: *${orderId}*\n` +
            `Amount: ₦${(event.data.amount / 100).toLocaleString()}\n` +
            `Reference: ${reference}\n\n` +
            `Your order is now being prepared! We'll notify you when it's on the way. 🚀`,
          [
            { id: "TRACK_ORDER", title: "📦 Track Order" },
            { id: "TALK_AGENT", title: "💬 Talk to Agent" },
          ]
        );

        // Notify admin
        const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminNumber) {
          await sendText(
            adminNumber,
            `💳 *Payment Received!*\n\nOrder: *${orderId}*\nAmount: ₦${(event.data.amount / 100).toLocaleString()}\nCustomer: +${customerPhone}\nRef: ${reference}`
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Payment webhook error:", err);
    res.sendStatus(200); // Always return 200 to Paystack
  }
});

// Payment callback — customer is redirected here after payment
router.get("/callback", async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>❌ Invalid payment reference</h2>
        <p>Please contact support.</p>
      </body></html>
    `);
  }

  const result = await verifyPayment(reference);

  if (result.success) {
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a0a;color:white">
        <div style="max-width:400px;margin:0 auto">
          <div style="font-size:64px;margin-bottom:16px">🎉</div>
          <h1 style="color:#22c55e">Payment Successful!</h1>
          <p style="color:#888">Your order has been confirmed.</p>
          <p style="color:#888">Reference: <strong style="color:white">${reference}</strong></p>
          <p style="margin-top:24px;color:#888">Return to WhatsApp to track your order.</p>
        </div>
      </body></html>
    `);
  } else {
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a0a;color:white">
        <div style="max-width:400px;margin:0 auto">
          <div style="font-size:64px;margin-bottom:16px">❌</div>
          <h1 style="color:#ef4444">Payment Failed</h1>
          <p style="color:#888">Something went wrong with your payment.</p>
          <p style="margin-top:24px;color:#888">Please try again or contact support on WhatsApp.</p>
        </div>
      </body></html>
    `);
  }
});

module.exports = router;