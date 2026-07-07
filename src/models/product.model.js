const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: String, required: true },      // e.g. "Football"
    subcategory: { type: String, required: true },   // e.g. "Jerseys"
    available: { type: Boolean, default: true },
    emoji: { type: String, default: "🛍️" },
    sizes: { type: [String], default: [] },          // e.g. ["S","M","L","XL"]
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
