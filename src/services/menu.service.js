const Product = require("../models/product.model");
const Session = require("../models/session.model");
const Order = require("../models/order.model");
const { sendText, sendButtons, sendList } = require("./whatsapp.service");
const { calculateDelivery } = require("./delivery.service");

const PACKAGING_FEE = 500;
const CEO_WHATSAPP = "2349049172767";

// ─── WELCOME MENU ───
const sendWelcomeMenu = async (to, session) => {
  session.state = "IDLE";
  session.cart = [];
  session.currentCategory = null;
  await session.save();

  await sendList(
    to,
    "👋 Psychowrld Luxury Wears",
    "Welcome! 🔥 Your premium sports & streetwear destination.\n\nWhat would you like to do?",
    "Get Started",
    [
      {
        title: "Main Menu",
        rows: [
          { id: "MAIN_SHOP", title: "🛒 Shop Now", description: "Browse our full catalog" },
          { id: "TRACK_ORDER", title: "📦 Track Order", description: "Check your order status" },
          { id: "MANUFACTURING_ENQUIRY", title: "🏭 Manufacturing", description: "Custom & bulk orders" },
          { id: "TALK_AGENT", title: "💬 Talk to Agent", description: "Speak with our team" },
        ],
      },
    ]
  );
};

// ─── SHOP MENU ───
const sendShopMenu = async (to, session) => {
  session.state = "SHOP_MENU";
  await session.save();

  await sendButtons(
    to,
    "🛍️ *Psychowrld Store*\n\nHow would you like to browse?",
    [
      { id: "BROWSE_CATEGORIES", title: "📂 Categories" },
      { id: "BROWSE_COLLECTIONS", title: "✨ Collections" },
      { id: "VIEW_CART", title: "🛒 My Cart" },
    ]
  );
};

// ─── CATEGORIES PAGE 1 ───
const sendCategories = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const categories = await Product.distinct("category", {
    available: true,
    category: { $nin: ["World Cup Collection 26", "Psychowrld NSFW Collection"] },
  });

  const page1 = categories.slice(0, 9);
  const hasMore = categories.length > 9;

  const rows = page1.map((cat) => ({
    id: `CAT_${cat.toUpperCase().replace(/\s/g, "_")}`,
    title: cat.length > 24 ? cat.substring(0, 24) : cat,
    description: `Browse ${cat}`,
  }));

  if (hasMore) {
    rows.push({
      id: "MORE_CATEGORIES",
      title: "➡️ More Categories",
      description: "See more",
    });
  }

  await sendList(to, "📂 Categories", "Select a category:", "View Categories", [
    { title: "All Categories", rows },
  ]);
};

// ─── CATEGORIES PAGE 2 ───
const sendMoreCategories = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const categories = await Product.distinct("category", {
    available: true,
    category: { $nin: ["World Cup Collection 26", "Psychowrld NSFW Collection"] },
  });

  const page2 = categories.slice(9);
  const rows = page2.map((cat) => ({
    id: `CAT_${cat.toUpperCase().replace(/\s/g, "_")}`,
    title: cat.length > 24 ? cat.substring(0, 24) : cat,
    description: `Browse ${cat}`,
  }));

  rows.push({ id: "BROWSE_CATEGORIES", title: "⬅️ Back", description: "Previous page" });

  await sendList(to, "📂 More Categories", "Select a category:", "View Categories", [
    { title: "More Categories", rows },
  ]);
};

// ─── COLLECTIONS ───
const sendCollections = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  await sendList(
    to,
    "✨ Collections",
    "Our exclusive collections:",
    "View Collections",
    [
      {
        title: "Special Collections",
        rows: [
          { id: "CAT_WORLD_CUP_COLLECTION_26", title: "🌍 World Cup 26", description: "Nigeria & team jerseys" },
          { id: "CAT_PSYCHOWRLD_NSFW_COLLECTION", title: "🔞 NSFW Collection", description: "Bold limited pieces" },
        ],
      },
    ]
  );
};

// ─── SUBCATEGORIES ───
const sendSubcategories = async (to, session, categoryName) => {
  session.state = "BROWSING_SUBCATEGORIES";
  session.currentCategory = categoryName;
  await session.save();

  const subcategories = await Product.distinct("subcategory", {
    category: categoryName,
    available: true,
  });

  if (subcategories.length === 0) {
    await sendText(to, `😔 Nothing in ${categoryName} right now.`);
    return await sendCategories(to, session);
  }

  // If only one subcategory, skip straight to items
  if (subcategories.length === 1) {
    return await sendItems(to, session, categoryName, subcategories[0]);
  }

  const rows = subcategories.slice(0, 9).map((sub) => ({
    id: `SUB_${categoryName.toUpperCase().replace(/\s/g, "_")}__${sub.toUpperCase().replace(/\s/g, "_")}`,
    title: sub.length > 24 ? sub.substring(0, 24) : sub,
    description: `View ${sub}`,
  }));

  rows.push({ id: "BROWSE_CATEGORIES", title: "⬅️ Back", description: "Back to categories" });

  await sendList(to, `📦 ${categoryName}`, "Select a subcategory:", "View Items", [
    { title: categoryName, rows },
  ]);
};

// ─── ITEMS IN SUBCATEGORY ───
const sendItems = async (to, session, categoryName, subcategoryName) => {
  session.state = "BROWSING_ITEMS";
  session.currentCategory = categoryName;
  session.currentSubcategory = subcategoryName;
  await session.save();

  const products = await Product.find({
    category: categoryName,
    subcategory: subcategoryName,
    available: true,
  }).limit(9);

  if (products.length === 0) {
    await sendText(to, `😔 No items in ${subcategoryName} right now.`);
    return await sendSubcategories(to, session, categoryName);
  }

  const rows = products.map((p) => ({
    id: `ITEM_${p._id}`,
    title: p.name.length > 24 ? p.name.substring(0, 24) : p.name,
    description: `₦${p.price.toLocaleString()} • Sizes: ${p.sizes.join(", ")}`,
  }));

  rows.push({
    id: `CAT_${categoryName.toUpperCase().replace(/\s/g, "_")}`,
    title: "⬅️ Back",
    description: "Back to subcategories",
  });

  await sendList(to, `🛍️ ${subcategoryName}`, "Select an item to add to cart:", "View Items", [
    { title: subcategoryName, rows },
  ]);
};

// ─── ADD TO CART ───
const addToCart = async (to, session, productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    await sendText(to, "❌ Item not found.");
    return;
  }

  // Ask for size if product has sizes
  if (product.sizes && product.sizes.length > 0 && product.sizes[0] !== "One Size") {
    session.state = "AWAITING_SIZE";
    session.pendingProductId = productId;
    await session.save();

    const sizeList = product.sizes.map((s) => ({ id: `SIZE_${productId}_${s}`, title: s, description: `Size ${s}` }));

    await sendList(
      to,
      `📏 Select Size`,
      `*${product.name}* — ₦${product.price.toLocaleString()}\n\nChoose your size:`,
      "Select Size",
      [{ title: "Available Sizes", rows: sizeList }]
    );
    return;
  }

  await doAddToCart(to, session, product, "One Size");
};

const doAddToCart = async (to, session, product, size) => {
  const cartKey = `${product._id}_${size}`;
  const existing = session.cart.find((i) => i.productId === cartKey);

  if (existing) {
    existing.quantity += 1;
  } else {
    session.cart.push({
      productId: cartKey,
      name: `${product.name} (${size})`,
      price: product.price,
      quantity: 1,
    });
  }

  session.state = "BROWSING_ITEMS";
  await session.save();

  const catId = `CAT_${(session.currentCategory || "").toUpperCase().replace(/\s/g, "_")}`;

  await sendButtons(
    to,
    `✅ *${product.name} (${size})* added to cart!\n\n🛒 ${session.cart.length} item(s) in cart`,
    [
      { id: "VIEW_CART", title: "🛒 View Cart" },
      { id: catId, title: "➕ Add More" },
      { id: "BROWSE_CATEGORIES", title: "📂 Categories" },
    ]
  );
};

// ─── CART SUMMARY ───
const sendCartSummary = async (to, session) => {
  if (!session.cart || session.cart.length === 0) {
    await sendButtons(to, "🛒 Your cart is empty!", [
      { id: "MAIN_SHOP", title: "🛍️ Shop Now" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]);
    return;
  }

  session.state = "CART";
  await session.save();

  let itemsList = "";
  let subtotal = 0;

  session.cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    itemsList += `• ${item.name} x${item.quantity} — ₦${itemTotal.toLocaleString()}\n`;
  });

  await sendButtons(
    to,
    `🛒 *Your Cart:*\n\n${itemsList}\nSubtotal: ₦${subtotal.toLocaleString()}\nPackaging: ₦${PACKAGING_FEE.toLocaleString()}\n_Delivery calculated at checkout_\n━━━━━━━━━━━━━\n*Subtotal: ₦${(subtotal + PACKAGING_FEE).toLocaleString()}*`,
    [
      { id: "CONFIRM_ORDER", title: "✅ Checkout" },
      { id: "EDIT_ORDER", title: "✏️ Edit Cart" },
      { id: "BROWSE_CATEGORIES", title: "➕ Add More" },
    ]
  );
};

// ─── EDIT CART ───
const sendEditOrder = async (to, session) => {
  if (!session.cart || session.cart.length === 0) {
    await sendText(to, "🛒 Cart is already empty!");
    return await sendWelcomeMenu(to, session);
  }

  session.state = "EDITING_CART";
  await session.save();

  const rows = session.cart.slice(0, 9).map((item, index) => ({
    id: `REMOVE_${index}`,
    title: `❌ ${item.name}`.substring(0, 24),
    description: `₦${item.price.toLocaleString()} x${item.quantity}`,
  }));

  rows.push({ id: "CLEAR_CART", title: "🗑️ Clear Cart", description: "Remove all items" });

  await sendList(to, "✏️ Edit Cart", "Select item to remove:", "Edit Cart", [
    { title: "Your Items", rows },
  ]);
};

// ─── REMOVE FROM CART ───
const removeFromCart = async (to, session, index) => {
  if (index === "CLEAR") {
    session.cart = [];
    await session.save();
    await sendText(to, "🗑️ Cart cleared!");
    return await sendWelcomeMenu(to, session);
  }

  const idx = parseInt(index);
  if (idx >= 0 && idx < session.cart.length) {
    const removed = session.cart.splice(idx, 1);
    await session.save();
    await sendText(to, `✅ *${removed[0].name}* removed.`);
  }

  if (session.cart.length === 0) return await sendWelcomeMenu(to, session);
  await sendCartSummary(to, session);
};

// ─── CHECKOUT - ASK ADDRESS ───
const askDeliveryAddress = async (to, session) => {
  session.state = "AWAITING_ADDRESS";
  await session.save();

  await sendText(
    to,
    "📍 Please send your *full delivery address* including city and state.\n\nExample:\n_12 Admiralty Way, Lekki Phase 1, Lagos_"
  );
};

// ─── CONFIRM ORDER WITH DELIVERY CALC ───
const confirmOrderWithAddress = async (to, session, address) => {
  session.deliveryAddress = address;
  await session.save();

  await sendText(to, "⏳ Calculating your delivery fee...");

  const deliveryFee = await calculateDelivery(address);

  let subtotal = 0;
  session.cart.forEach((item) => { subtotal += item.price * item.quantity; });
  const total = subtotal + PACKAGING_FEE + deliveryFee;

  session.state = "AWAITING_PAYMENT";
  await session.save();

  const order = new Order({
    waNumber: to,
    items: session.cart,
    subtotal,
    deliveryFee,
    total,
    deliveryAddress: address,
    status: "confirmed",
  });
  await order.save();

  await sendButtons(
    to,
    `✅ *Order Summary*\n\n` +
      `Order ID: *${order.orderId}*\n` +
      `Delivery to: ${address}\n\n` +
      `Subtotal: ₦${subtotal.toLocaleString()}\n` +
      `Delivery: ₦${deliveryFee.toLocaleString()}\n` +
      `Packaging: ₦${PACKAGING_FEE.toLocaleString()}\n` +
      `━━━━━━━━━━━━━\n` +
      `*Total: ₦${total.toLocaleString()}*`,
    [
      { id: `PAY_${order.orderId}`, title: "💳 Pay Now" },
      { id: "TALK_AGENT", title: "💬 Contact Us" },
    ]
  );

  return order;
};

// ─── TRACK ORDER ───
const trackOrder = async (to) => {
  const order = await Order.findOne({ waNumber: to }).sort({ createdAt: -1 });

  if (!order) {
    await sendButtons(to, "📦 No orders found.\n\nWant to place one?", [
      { id: "MAIN_SHOP", title: "🛒 Shop Now" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]);
    return;
  }

  const statusEmoji = { pending: "⏳", confirmed: "✅", paid: "💳", preparing: "👨‍🍳", out_for_delivery: "🚴", delivered: "🎉", cancelled: "❌" };
  const statusText = { pending: "Pending", confirmed: "Confirmed", paid: "Payment Received", preparing: "Being Prepared", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled" };

  await sendButtons(
    to,
    `📦 *Order Tracking*\n\nOrder ID: *${order.orderId}*\nStatus: ${statusEmoji[order.status]} *${statusText[order.status]}*\nTotal: ₦${order.total?.toLocaleString()}\nAddress: ${order.deliveryAddress || "Not set"}`,
    [
      { id: "MAIN_SHOP", title: "🛒 New Order" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]
  );
};

// ─── MANUFACTURING ENQUIRY ───
const sendManufacturingEnquiry = async (to, session) => {
  session.state = "MANUFACTURING_ENQUIRY";
  await session.save();

  await sendButtons(
    to,
    `🏭 *Manufacturing Enquiries*\n\nLooking to manufacture custom sportswear, jerseys, or streetwear with Psychowrld?\n\nWe offer:\n• Custom jersey printing\n• Bulk sportswear production\n• Private label streetwear\n• Team & club kits\n• Event merchandise\n\nHow would you like to proceed?`,
    [
      { id: "MANUFACTURING_PROCEED", title: "✅ Proceed" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]
  );
};

const sendManufacturingRedirect = async (to, session) => {
  session.state = "IDLE";
  await session.save();

  await sendText(
    to,
    `🔗 *Connecting you to our CEO...*\n\nYou'll be redirected to speak directly with our CEO about your manufacturing enquiry.\n\nPlease send a message on WhatsApp:\n👉 https://wa.me/${CEO_WHATSAPP}\n\nMention:\n• What you want to produce\n• Quantity needed\n• Your timeline\n\nWe look forward to working with you! 🔥`
  );
};

module.exports = {
  sendWelcomeMenu,
  sendShopMenu,
  sendCategories,
  sendMoreCategories,
  sendCollections,
  sendSubcategories,
  sendItems,
  addToCart,
  doAddToCart,
  sendCartSummary,
  sendEditOrder,
  removeFromCart,
  askDeliveryAddress,
  confirmOrderWithAddress,
  trackOrder,
  sendManufacturingEnquiry,
  sendManufacturingRedirect,
};