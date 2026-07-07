const { VERIFY_TOKEN } = require("../config/whatsapp.config");
const { sendText, sendButtons } = require("../services/whatsapp.service");
const {
  sendWelcomeMenu, sendShopMenu, sendCategories, sendMoreCategories,
  sendCollections, sendSubcategories, sendItems, addToCart, doAddToCart,
  sendCartSummary, sendEditOrder, removeFromCart, askDeliveryAddress,
  confirmOrderWithAddress, trackOrder, sendManufacturingEnquiry, sendManufacturingRedirect,
} = require("../services/menu.service");
const Session = require("../models/session.model");
const Product = require("../models/product.model");

// GET — Meta webhook verification
const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// POST — incoming messages
const handleIncomingMessage = async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;
    const value = body.entry?.[0]?.changes?.[0]?.value;
    if (value?.statuses) return;
    const messages = value?.messages;
    if (!messages?.length) return;

    const message = messages[0];
    const from = message.from;

    let session = await Session.findOne({ waNumber: from });
    if (!session) {
      session = new Session({ waNumber: from });
      await session.save();
    }

    if (message.type === "text") {
      await handleText(from, message.text.body.trim(), session);
    } else if (message.type === "interactive") {
      const { type, button_reply, list_reply } = message.interactive;
      if (type === "button_reply") await handleButton(from, button_reply.id, session);
      if (type === "list_reply") await handleListReply(from, list_reply.id, list_reply.title, session);
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
  }
};

// Handle plain text
const handleText = async (from, text, session) => {
  const lower = text.toLowerCase();

  // Global triggers
  if (["hi", "hello", "start", "hey", "new order"].includes(lower)) return await sendWelcomeMenu(from, session);
  if (["track", "track order", "my order"].includes(lower)) return await trackOrder(from);
  if (["agent", "help", "talk to agent"].includes(lower)) return await escalateToAgent(from, session);
  if (["cart", "my cart", "view cart"].includes(lower)) return await sendCartSummary(from, session);
  if (["shop", "shop now", "browse"].includes(lower)) return await sendShopMenu(from, session);

  // Awaiting address
  if (session.state === "AWAITING_ADDRESS") return await confirmOrderWithAddress(from, session, text);

  // Agent mode — don't auto reply
  if (session.agentMode) { console.log(`📨 Agent msg from ${from}: ${text}`); return; }

  // Fallback
  await sendButtons(from, "👋 Not sure what you mean. What would you like to do?", [
    { id: "MAIN_SHOP", title: "🛒 Shop Now" },
    { id: "TRACK_ORDER", title: "📦 Track Order" },
    { id: "TALK_AGENT", title: "💬 Talk to Agent" },
  ]);
};

// Handle button taps
const handleButton = async (from, id, session) => {
  console.log(`🔘 Button: ${id}`);

  if (id === "MAIN_SHOP") return await sendShopMenu(from, session);
  if (id === "BROWSE_CATEGORIES") return await sendCategories(from, session);
  if (id === "MORE_CATEGORIES") return await sendMoreCategories(from, session);
  if (id === "BROWSE_COLLECTIONS") return await sendCollections(from, session);
  if (id === "VIEW_CART") return await sendCartSummary(from, session);
  if (id === "EDIT_ORDER") return await sendEditOrder(from, session);
  if (id === "TRACK_ORDER") return await trackOrder(from);
  if (id === "TALK_AGENT") return await escalateToAgent(from, session);
  if (id === "CONFIRM_ORDER") return await askDeliveryAddress(from, session);
  if (id === "MANUFACTURING_ENQUIRY") return await sendManufacturingEnquiry(from, session);
  if (id === "MANUFACTURING_PROCEED") return await sendManufacturingRedirect(from, session);

  // Category shortcut from button
  if (id.startsWith("CAT_")) {
    const categoryName = await findRealCategoryName(id.replace("CAT_", ""));
    if (categoryName) return await sendSubcategories(from, session, categoryName);
  }

  // Payment
  if (id.startsWith("PAY_")) {
    const orderId = id.replace("PAY_", "");
    return await handlePayment(from, orderId);
  }

  await sendWelcomeMenu(from, session);
};

// Handle list selections
const handleListReply = async (from, id, title, session) => {
  console.log(`📋 List: ${id}`);

  if (id === "MORE_CATEGORIES") return await sendMoreCategories(from, session);
  if (id === "BROWSE_CATEGORIES") return await sendCategories(from, session);
  if (id === "MAIN_SHOP") return await sendShopMenu(from, session);
  if (id === "TRACK_ORDER") return await trackOrder(from);
  if (id === "TALK_AGENT") return await escalateToAgent(from, session);
  if (id === "MANUFACTURING_ENQUIRY") return await sendManufacturingEnquiry(from, session);
  if (id === "MANUFACTURING_PROCEED") return await sendManufacturingRedirect(from, session);
  if (id === "CLEAR_CART") return await removeFromCart(from, session, "CLEAR");

  // Category selected
  if (id.startsWith("CAT_")) {
    const categoryName = await findRealCategoryName(id.replace("CAT_", ""));
    if (categoryName) return await sendSubcategories(from, session, categoryName);
  }

  // Subcategory selected — format: SUB_CATEGORY__SUBCATEGORY
  if (id.startsWith("SUB_")) {
    const parts = id.replace("SUB_", "").split("__");
    const categoryName = await findRealCategoryName(parts[0]);
    const subcategoryName = await findRealSubcategoryName(parts[1], categoryName);
    if (categoryName && subcategoryName) {
      return await sendItems(from, session, categoryName, subcategoryName);
    }
  }

  // Item selected
  if (id.startsWith("ITEM_")) {
    const productId = id.replace("ITEM_", "");
    return await addToCart(from, session, productId);
  }

  // Size selected — format: SIZE_productId_size
  if (id.startsWith("SIZE_")) {
    const parts = id.replace("SIZE_", "").split("_");
    const size = parts[parts.length - 1];
    const productId = parts.slice(0, -1).join("_");
    const product = await Product.findById(productId);
    if (product) return await doAddToCart(from, session, product, size);
  }

  // Remove cart item
  if (id.startsWith("REMOVE_")) {
    const index = id.replace("REMOVE_", "");
    return await removeFromCart(from, session, index);
  }

  await sendWelcomeMenu(from, session);
};

// Helper — find real category name from uppercased ID
const findRealCategoryName = async (uppercasedName) => {
  const normalized = uppercasedName.replace(/_/g, " ");
  const product = await Product.findOne({
    category: new RegExp(`^${normalized}$`, "i"),
    available: true,
  });
  return product ? product.category : null;
};

// Helper — find real subcategory name
const findRealSubcategoryName = async (uppercasedName, categoryName) => {
  const normalized = uppercasedName.replace(/_/g, " ");
  const product = await Product.findOne({
    category: categoryName,
    subcategory: new RegExp(`^${normalized}$`, "i"),
    available: true,
  });
  return product ? product.subcategory : null;
};

// Escalate to agent
const escalateToAgent = async (from, session) => {
  session.agentMode = true;
  session.state = "AGENT_MODE";
  await session.save();

  await sendText(from, "👤 *Connected to an agent!*\n\nSomeone will be with you shortly.\n\nType *hi* to return to the bot menu.");

  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (adminNumber) {
    await sendText(adminNumber, `🔔 *Agent Request*\nCustomer: +${from}\nReply to them directly on WhatsApp.`);
  }
};

// Handle payment
const handlePayment = async (from, orderId) => {
  const Order = require("../models/order.model");
  const order = await Order.findOne({ orderId });
  if (!order) { await sendText(from, "❌ Order not found. Type *agent* for help."); return; }

  await sendText(
    from,
    `💳 *Payment for Order ${orderId}*\n\nAmount: ₦${order.total?.toLocaleString()}\n\nPlease transfer to:\n🏦 Bank: GT Bank\n💳 Account: 0123456789\n👤 Name: Psychowrld Luxury Wears\n\nSend proof of payment here or type *agent* to speak with us.\n\n_Payment gateway coming soon!_`
  );
};

module.exports = { verifyWebhook, handleIncomingMessage };