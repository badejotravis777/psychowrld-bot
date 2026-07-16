const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  quantity: { type: Number, default: 1 },
});

const orderQueueItemSchema = new mongoose.Schema({
  productId: String,
  quantity: { type: Number, default: 1 },
});

const sessionSchema = new mongoose.Schema(
  {
    waNumber: { type: String, required: true, unique: true },
    state: { type: String, default: "IDLE" },
    cart: [cartItemSchema],
    currentCategory: { type: String, default: null },
    currentSubcategory: { type: String, default: null },
    pendingProductId: { type: String, default: null },
    pendingSize: { type: String, default: null },
    pendingColor: { type: String, default: null },
    pendingQuantity: { type: Number, default: null },
    pendingAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    pendingAttributeIndex: { type: Number, default: 0 },
    customerName: { type: String, default: null },
    customerPhone: { type: String, default: null },
    pendingDeliveryAddress: { type: String, default: null },
    pendingDistanceKm: { type: Number, default: null },
    pendingDeliveryFinalizeType: { type: String, default: null },
    orderQueue: [orderQueueItemSchema],
    deliveryAddress: { type: String, default: null },
    deliveryType: { type: String, default: null }, // "domestic" | "international"
    deliveryCountry: { type: String, default: null },
    pendingDeliveryFee: { type: Number, default: null },
    pendingDeliveryRegion: { type: String, default: null },
    agentMode: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionSchema.pre("save", function () {
  this.lastActivity = new Date();
});

module.exports = mongoose.model("Session", sessionSchema);