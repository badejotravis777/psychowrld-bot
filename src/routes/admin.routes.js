const express = require("express");
const router = express.Router();
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { sendText } = require("../services/whatsapp.service");

// Get all orders
router.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// Update order status
router.patch("/orders/:orderId/status", async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOneAndUpdate(
    { orderId: req.params.orderId },
    { status },
    { new: true }
  );

  if (!order) return res.status(404).json({ error: "Order not found" });

  // Notify customer
  const statusMessages = {
    preparing: "👨‍🍳 Your order is being prepared!",
    out_for_delivery: "🚴 Your order is on the way! Our rider is heading to you.",
    delivered: "🎉 Your order has been delivered! Enjoy your items. Thank you for shopping with Psychowrld!",
    cancelled: "❌ Your order has been cancelled. Please contact us for more info.",
  };

  if (statusMessages[status]) {
    await sendText(
      order.waNumber,
      `${statusMessages[status]}\n\nOrder ID: *${order.orderId}*\n\nType *track* to check your order status anytime.`
    );
  }

  res.json(order);
});

// Get all products
router.get("/products", async (req, res) => {
  const products = await Product.find().sort({ category: 1 });
  res.json(products);
});

// Add product
router.post("/products", async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json(product);
});

// Toggle product availability
router.patch("/products/:id/toggle", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.available = !product.available;
  await product.save();
  res.json(product);
});

module.exports = router;
