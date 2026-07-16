const { VERIFY_TOKEN } = require("../config/whatsapp.config");
const { sendText, sendButtons } = require("../services/whatsapp.service");
const {
  sendWelcomeMenu, sendShopMenu, sendCategories, sendMoreCategories,
  sendCollections, sendMoreCollections, sendCollectionProducts, sendSubcategories, sendItems, addToCart, doAddToCart, askColor,
  askCustomAttributes, sendAllProducts,
  sendCartSummary, sendEditOrder, removeFromCart, askDeliveryType, askDeliveryAddress,
  confirmOrderWithAddress, confirmOrderWithCountry, finalizeInternationalOrder, finalizeManualQuoteOrder,
  trackOrder, sendManufacturingEnquiry, sendManufacturingRedirect,
  handleOrderMessage, sendCustomOrderPrompt, sendWebsiteLink,
} = require("../services/menu.service");
const Session = require("../models/session.model");
const Product = require("../models/product.model");

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
    } else if (message.type === "order") {
      await handleOrderMessage(from, message.order, session);
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
  }
};

const handleText = async (from, text, session) => {
  const lower = text.toLowerCase();

  if (["hi", "hello", "start", "hey", "new order"].includes(lower)) return await sendWelcomeMenu(from, session);
  if (["track", "track order", "my order"].includes(lower)) return await trackOrder(from);
  if (["agent", "help", "talk to agent"].includes(lower)) return await escalateToAgent(from, session);
  if (["cart", "my cart", "view cart"].includes(lower)) return await sendCartSummary(from, session);
  if (["shop", "shop now", "browse"].includes(lower)) return await sendShopMenu(from, session);

  if (session.state === "AWAITING_ADDRESS") return await confirmOrderWithAddress(from, session, text);
  if (session.state === "AWAITING_COUNTRY") return await confirmOrderWithCountry(from, session, text);
  if (session.state === "AWAITING_ADDRESS_INTL") return await finalizeInternationalOrder(from, session, text);
  if (session.state === "AWAITING_ADDRESS_MANUAL_QUOTE") return await finalizeManualQuoteOrder(from, session, text);

  
  if (session.state === "AWAITING_CUSTOM_SIZE") {
    const product = await Product.findById(session.pendingProductId);
    if (product) {
      session.state = "PROCESSING_ORDER_QUEUE";
      await session.save();
      return await askColor(from, session, product, text);
    }
    return await sendWelcomeMenu(from, session);
  }

  if (session.state === "AWAITING_CUSTOM_COLOR") {
    const product = await Product.findById(session.pendingProductId);
    if (product) {
      session.pendingColor = text;
      session.state = "PROCESSING_ORDER_QUEUE";
      await session.save();
      const size = session.pendingSize || "One Size";
      const attrs = product.customAttributes || [];
      if (attrs.length > 0) {
        return await askCustomAttributes(from, session, product, size, text, 0);
      }
      return await doAddToCart(from, session, product, size, text);
    }
    return await sendWelcomeMenu(from, session);
  }

  if (session.state === "CUSTOM_ORDER_MODE") {
    session.state = "IDLE";
    await session.save();
    await sendText(from, "✅ Got it! Our team will review your custom order request and get back to you shortly. You can also type *agent* anytime to chat with us directly.");
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      await sendText(adminNumber, `🔔 *Custom Order Request*\nCustomer: +${from}\nDetails: ${text}`);
    }
    return;
  }

  if (session.agentMode) {
    console.log(`📨 Agent msg from ${from}: ${text}`);
    try {
      const axios = require("axios");
      await axios.post(
        `${process.env.ADMIN_URL}/api/agent-sessions/incoming`,
        { customerNumber: from, text },
        { headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET } }
      );
    } catch (e) {
      console.error("Forward message error:", e.message);
    }
    return;
  }

  await sendButtons(from, "👋 Not sure what you mean. What would you like to do?", [
    { id: "MAIN_SHOP", title: "🛒 Shop Now" },
    { id: "TRACK_ORDER", title: "📦 Track Order" },
    { id: "TALK_AGENT", title: "💬 Talk to Agent" },
  ]);
};

const handleButton = async (from, id, session) => {
  console.log(`🔘 Button: ${id}`);

  if (id === "MAIN_SHOP") return await sendShopMenu(from, session);
  if (id === "BROWSE_COLLECTIONS") return await sendCollections(from, session);
  if (id === "ALL_PRODUCTS") return await sendAllProducts(from, session);
  if (id === "MORE_CATEGORIES") return await sendMoreCategories(from, session);
  if (id === "VIEW_CART") return await sendCartSummary(from, session);
  if (id === "EDIT_ORDER") return await sendEditOrder(from, session);
  if (id === "TRACK_ORDER") return await trackOrder(from);
  if (id === "TALK_AGENT") return await escalateToAgent(from, session);
  if (id === "CONFIRM_ORDER") return await askDeliveryType(from, session);
  if (id === "DELIVERY_DOMESTIC") {
    session.deliveryType = "domestic";
    await session.save();
    return await askDeliveryAddress(from, session);
  }
  if (id === "DELIVERY_INTERNATIONAL") {
    session.deliveryType = "international";
    session.state = "AWAITING_COUNTRY";
    await session.save();
    await sendText(from, "🌍 Please type the *country* you're shipping to (e.g. *United Kingdom*, *Ghana*, *United States*):");
    return;
  }
  if (id === "RETRY_ADDRESS") return await askDeliveryAddress(from, session);
  if (id === "MANUFACTURING_ENQUIRY") return await sendManufacturingEnquiry(from, session);
  if (id === "MANUFACTURING_PROCEED") return await sendManufacturingRedirect(from, session);
  if (id === "CUSTOM_ORDER") return await sendCustomOrderPrompt(from, session);
  if (id === "VISIT_WEBSITE") return await sendWebsiteLink(from, session);

  if (id.startsWith("CAT_")) {
    const categoryName = await findRealCategoryName(id.replace("CAT_", ""));
    if (categoryName) return await sendSubcategories(from, session, categoryName);
  }

  if (id.startsWith("ALLPRODUCTS_PAGE_")) {
    const page = parseInt(id.replace("ALLPRODUCTS_PAGE_", ""));
    return await sendAllProducts(from, session, page);
  }

  if (id.startsWith("COLLECTION_")) {
    const collectionName = await findRealCollectionName(id.replace("COLLECTION_", ""));
    if (collectionName) return await sendCollectionProducts(from, session, collectionName);
  }

  if (id === "MORE_COLLECTIONS") return await sendMoreCollections(from, session);

  if (id.startsWith("PAY_")) {
    const orderId = id.replace("PAY_", "");
    return await handlePayment(from, orderId);
  }

  if (id.startsWith("OFFERSIZE_")) {
    const productId = id.replace("OFFERSIZE_", "");
    session.state = "AWAITING_CUSTOM_SIZE";
    session.pendingProductId = productId;
    await session.save();
    await sendText(from, "📝 Please type your size (e.g. *32 waist*, *UK 12*, *M*):");
    return;
  }

  if (id.startsWith("SKIPSIZE_")) {
    const productId = id.replace("SKIPSIZE_", "");
    const product = await Product.findById(productId);
    if (product) return await askColor(from, session, product, "One Size");
    return await sendWelcomeMenu(from, session);
  }

  if (id.startsWith("OFFERCOLOR_")) {
    const productId = id.replace("OFFERCOLOR_", "");
    session.state = "AWAITING_CUSTOM_COLOR";
    session.pendingProductId = productId;
    await session.save();
    await sendText(from, "📝 Please type your color (e.g. *Navy Blue*, *Forest Green*):");
    return;
  }

  if (id.startsWith("SKIPCOLOR_")) {
    const productId = id.replace("SKIPCOLOR_", "");
    const product = await Product.findById(productId);
    if (product) {
      session.pendingProductId = productId;
      session.state = "PROCESSING_ORDER_QUEUE";
      await session.save();
      const size = session.pendingSize || "One Size";
      const attrs = product.customAttributes || [];
      if (attrs.length > 0) {
        return await askCustomAttributes(from, session, product, size, "", 0);
      }
      return await doAddToCart(from, session, product, size, "");
    }
    return await sendWelcomeMenu(from, session);
  }

  await sendWelcomeMenu(from, session);
};

const handleListReply = async (from, id, title, session) => {
  console.log(`📋 List: ${id}`);

  if (id === "MORE_CATEGORIES") return await sendMoreCategories(from, session);
  if (id === "BROWSE_CATEGORIES") return await sendCategories(from, session);
  if (id === "MAIN_SHOP") return await sendShopMenu(from, session);
  if (id === "TRACK_ORDER") return await trackOrder(from);
  if (id === "TALK_AGENT") return await escalateToAgent(from, session);
  if (id === "MANUFACTURING_ENQUIRY") return await sendManufacturingEnquiry(from, session);
  if (id === "MANUFACTURING_PROCEED") return await sendManufacturingRedirect(from, session);
  if (id === "CUSTOM_ORDER") return await sendCustomOrderPrompt(from, session);
  if (id === "VISIT_WEBSITE") return await sendWebsiteLink(from, session);
  if (id === "CLEAR_CART") return await removeFromCart(from, session, "CLEAR");
  if (id === "ALL_PRODUCTS") return await sendAllProducts(from, session);
  if (id === "BROWSE_COLLECTIONS") return await sendCollections(from, session);
  if (id === "VIEW_CART") return await sendCartSummary(from, session);

  if (id.startsWith("ALLPRODUCTS_PAGE_")) {
    const page = parseInt(id.replace("ALLPRODUCTS_PAGE_", ""));
    return await sendAllProducts(from, session, page);
  }

  if (id === "MORE_COLLECTIONS") return await sendMoreCollections(from, session);

  if (id.startsWith("COLLECTION_")) {
    const collectionName = await findRealCollectionName(id.replace("COLLECTION_", ""));
    if (collectionName) return await sendCollectionProducts(from, session, collectionName);
  }

  if (id.startsWith("CAT_")) {
    const categoryName = await findRealCategoryName(id.replace("CAT_", ""));
    if (categoryName) return await sendSubcategories(from, session, categoryName);
  }

  if (id.startsWith("SUB_")) {
    const parts = id.replace("SUB_", "").split("__");
    const categoryName = await findRealCategoryName(parts[0]);
    const subcategoryName = await findRealSubcategoryName(parts[1], categoryName);
    if (categoryName && subcategoryName !== null) {
      const displayLabel = parts[1] === "NONE" ? "General" : subcategoryName;
      return await sendItems(from, session, categoryName, subcategoryName, displayLabel);
    }
  }

  if (id.startsWith("ITEM_")) {
    const productId = id.replace("ITEM_", "");
    return await addToCart(from, session, productId);
  }

  if (id.startsWith("SIZE_")) {
    const withoutPrefix = id.replace("SIZE_", "");
    const separatorIndex = withoutPrefix.indexOf("__");
    const productId = withoutPrefix.substring(0, separatorIndex);
    const sizeRaw = withoutPrefix.substring(separatorIndex + 2);

    if (sizeRaw === "CUSTOM") {
      session.state = "AWAITING_CUSTOM_SIZE";
      session.pendingProductId = productId;
      await session.save();
      await sendText(from, "📝 Please type your custom size (e.g. *32 waist*, *UK 12*, *XS*):");
      return;
    }

    const size = sizeRaw.replace(/_/g, " ");
    const product = await Product.findById(productId);
    if (product) return await askColor(from, session, product, size);
  }

  if (id.startsWith("COLOR_")) {
    const withoutPrefix = id.replace("COLOR_", "");
    const separatorIndex = withoutPrefix.indexOf("__");
    const productId = withoutPrefix.substring(0, separatorIndex);
    const colorRaw = withoutPrefix.substring(separatorIndex + 2);

    if (colorRaw === "CUSTOM") {
      session.state = "AWAITING_CUSTOM_COLOR";
      session.pendingProductId = productId;
      await session.save();
      await sendText(from, "📝 Please type your custom color (e.g. *Navy Blue*, *Forest Green*):");
      return;
    }

    const color = colorRaw.replace(/_/g, " ");
    const product = await Product.findById(productId);
    if (product) {
      session.pendingColor = color;
      await session.save();
      return await askCustomAttributes(from, session, product, session.pendingSize || "One Size", color, 0);
    }
  }
// Custom attribute selected — format: ATTR_productId__attrIndex__value
if (id.startsWith("ATTR_")) {
  const withoutPrefix = id.replace("ATTR_", "");
  const firstSep = withoutPrefix.indexOf("__");
  const productId = withoutPrefix.substring(0, firstSep);
  const rest = withoutPrefix.substring(firstSep + 2);
  const secondSep = rest.indexOf("__");
  const attrIndex = parseInt(rest.substring(0, secondSep));
  const value = rest.substring(secondSep + 2).replace(/_/g, " ");

  const product = await Product.findById(productId);
  if (!product) return await sendWelcomeMenu(from, session);

  const attr = product.customAttributes?.[attrIndex];
  if (!attr) return await sendWelcomeMenu(from, session);

  if (!session.pendingAttributes) session.pendingAttributes = {};
  session.pendingAttributes[attr.name] = value;
  session.markModified("pendingAttributes");
  await session.save();

  return await askCustomAttributes(from, session, product, session.pendingSize || "One Size", session.pendingColor || "", attrIndex + 1);
}

// Remove cart item
if (id.startsWith("REMOVE_")) {
    const index = id.replace("REMOVE_", "");
    return await removeFromCart(from, session, index);
  }

  await sendWelcomeMenu(from, session);
};

const findRealCollectionName = async (uppercasedName) => {
  const normalized = uppercasedName.replace(/_/g, " ");
  const product = await Product.findOne({
    collections: new RegExp(`^${normalized}$`, "i"),
    available: true,
  });
  if (!product) return null;
  return product.collections.find((c) => c.toLowerCase() === normalized.toLowerCase()) || null;
};


const findRealCategoryName = async (uppercasedName) => {
  const normalized = uppercasedName.replace(/_/g, " ");
  const product = await Product.findOne({
    categories: new RegExp(`^${normalized}$`, "i"),
    available: true,
  });
  if (!product) return null;
  return product.categories.find((c) => c.toLowerCase() === normalized.toLowerCase()) || product.categories[0];
};

const getSubcategoryForCategory = (product, category) => {
  if (product.categorySubcategories && product.categorySubcategories.length > 0) {
    const match = product.categorySubcategories.find((cs) => cs.category === category);
    if (match) return match.subcategory || "";
  }
  return product.subcategory || "";
};

const findRealSubcategoryName = async (uppercasedName, categoryName) => {
  if (uppercasedName === "NONE") return "";
  const normalized = uppercasedName.replace(/_/g, " ").toLowerCase();

  const productsInCategory = await Product.find({
    categories: categoryName,
    available: true,
  });

  for (const p of productsInCategory) {
    const sub = getSubcategoryForCategory(p, categoryName);
    if (sub && sub.toLowerCase() === normalized) return sub;
  }

  return null;
};

const escalateToAgent = async (from, session) => {
  session.agentMode = true;
  session.state = "AGENT_MODE";
  await session.save();

  await sendText(from, "👤 *Connecting you to our team...*\n\nSomeone will be with you shortly. Please hold on. 😊\n\n_You'll be returned to the main menu automatically once your chat ends._");

  try {
    const axios = require("axios");
    await axios.post(
      `${process.env.ADMIN_URL}/api/agent-sessions/incoming`,
      { customerNumber: from, text: "🔔 Customer requested an agent" },
      { headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET } }
    );
  } catch (e) {
    console.error("Agent session create error:", e.message);
  }

  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (adminNumber) {
    await sendText(adminNumber, `🔔 *New Agent Request*\nCustomer: +${from}\n\nReply from the admin dashboard: ${process.env.ADMIN_URL}`);
  }
};

const handlePayment = async (from, orderId) => {
  const Order = require("../models/order.model");
  const { initializePayment } = require("../services/payment.service");

  const order = await Order.findOne({ orderId });
  if (!order) { await sendText(from, "❌ Order not found. Type *agent* for help."); return; }

  await sendText(from, "⏳ Generating your payment link...");

  const payment = await initializePayment(null, order.total, orderId, from);

  if (payment.success) {
    await sendButtons(
      from,
      `💳 *Payment for Order ${orderId}*\n\n` +
        `Amount: *₦${order.total?.toLocaleString()}*\n\n` +
        `Tap the link below to pay securely via card or bank transfer:\n\n` +
        `👉 ${payment.paymentUrl}\n\n` +
        `_Your order will be confirmed automatically once payment is complete._`,
      [
        { id: "TRACK_ORDER", title: "📦 Track Order" },
        { id: "TALK_AGENT", title: "💬 Need Help?" },
      ]
    );
  } else {
    await sendText(from, `❌ Could not generate payment link. Please contact us:\n\nType *agent* to speak with our team.`);
  }
};

module.exports = { verifyWebhook, handleIncomingMessage };