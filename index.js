require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");

const webhookRoutes = require("./src/routes/webhook.routes");
const adminRoutes = require("./src/routes/admin.routes");
const paymentRoutes = require("./src/routes/payment.routes");

const app = express();

// Raw body needed for Paystack webhook signature verification
app.use("/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/webhook", webhookRoutes);
app.use("/admin", adminRoutes);
app.use("/payment", paymentRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Psychowrld Bot is running 🚀" });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });