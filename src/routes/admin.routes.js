const express = require("express");
const router = express.Router();
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { sendText } = require("../services/whatsapp.service");
const { syncProductToCatalog, removeFromCatalog, syncAllProducts } = require("../services/catalog.service");

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
  // Sync to Meta catalog in background
  syncProductToCatalog(product).catch(console.error);
  res.json(product);
});

// Toggle product availability
router.patch("/products/:id/toggle", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.available = !product.available;
  await product.save();
  // Sync availability change to catalog
  syncProductToCatalog(product).catch(console.error);
  res.json(product);
});

// Sync all products to catalog manually
router.post("/sync-catalog", async (req, res) => {
  try {
    const products = await Product.find({ available: true });
    const result = await syncAllProducts(products);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;