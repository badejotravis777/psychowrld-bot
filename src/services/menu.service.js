const Product = require("../models/product.model");
const Session = require("../models/session.model");
const Order = require("../models/order.model");
const { sendText, sendButtons, sendList, sendProductList } = require("./whatsapp.service");
const { calculateDelivery } = require("./delivery.service");

const PACKAGING_FEE = 500;
const CEO_WHATSAPP = "2349049172767";
const CATALOG_ID = process.env.CATALOG_ID;

// Get the subcategory that applies to a product for a specific category
function getSubcategoryForCategory(product, category) {
  if (product.categorySubcategories && product.categorySubcategories.length > 0) {
    const match = product.categorySubcategories.find((cs) => cs.category === category);
    if (match) return match.subcategory || "";
  }
  return product.subcategory || "";
}

const BADGE_LABELS = { coming_soon: "🔜 Coming Soon", restocked: "🎉 Restocked" };
function getBadgeLabel(product) {
  return BADGE_LABELS[product.badge] || "";
}

// ─── WELCOME MENU ───
const sendWelcomeMenu = async (to, session) => {
  session.state = "IDLE";
  session.cart = [];
  session.currentCategory = null;
  await session.save();

  await sendList(
    to,
    "👋 Psychowrld",
    "Hi! 👋 I'm Mide.\n\nWelcome to Psychowrld. It's great to have you here. 😊\n\nI'm here to help you shop, place a custom order, book a manufacturing appointment, track an order, or answer any questions.\n\nOur team is available from 9:00 AM to 8:00 PM, but don't worry, you don't have to wait. You can place an order or book an appointment anytime, day or night, and we'll get back to you as soon as we're online.\n\nWhat would you like to do today?\n\n_Take your time. I'm here whenever you need me. 💙_",
    "Choose an Option",
    [
      {
        title: "Main Menu",
        rows: [
          { id: "MAIN_SHOP", title: "🛍️ Visit Psychowrld Store", description: "Browse our full catalog" },
          { id: "ALL_PRODUCTS", title: "🗂️ All Products", description: "See every item we have" },
          { id: "CUSTOM_ORDER", title: "✍️ Custom Order", description: "Tell us what you need" },
          { id: "MANUFACTURING_ENQUIRY", title: "📅 Manufacturing", description: "Book an appointment" },
          { id: "TRACK_ORDER", title: "📦 Track My Order", description: "Check your order status" },
          { id: "VISIT_WEBSITE", title: "🌐 Visit Our Website", description: "See more at psychowrld.co" },
          { id: "TALK_AGENT", title: "💬 Talk to Our Team", description: "Speak with us directly" },
        ],
      },
    ]
  );
};

// ─── SHOP MENU ───
const sendShopMenu = async (to, session) => {
  session.state = "SHOP_MENU";
  await session.save();

  await sendButtons(to, "🛍️ *Psychowrld Store*\n\nHow would you like to browse?", [
    { id: "BROWSE_CATEGORIES", title: "📂 Categories" },
    { id: "BROWSE_COLLECTIONS", title: "✨ Collections" },
    { id: "VIEW_CART", title: "🛒 My Cart" },
  ]);
};

// ─── CATEGORIES PAGE 1 ───
const sendCategories = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const categories = await Product.distinct("categories", {
    available: true,
    categories: { $nin: ["World Cup Collection 26", "Psychowrld NSFW Collection"] },
  });

  const page1 = categories.slice(0, 9);
  const hasMore = categories.length > 9;

  const rows = page1.map((cat) => ({
    id: `CAT_${cat.toUpperCase().replace(/\s/g, "_")}`,
    title: cat.length > 24 ? cat.substring(0, 24) : cat,
    description: `Browse ${cat}`,
  }));

  if (hasMore) {
    rows.push({ id: "MORE_CATEGORIES", title: "➡️ More Categories", description: "See more" });
  }

  await sendList(to, "📂 Categories", "Select a category:", "View Categories", [
    { title: "All Categories", rows },
  ]);
};

// ─── CATEGORIES PAGE 2 ───
const sendMoreCategories = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const categories = await Product.distinct("categories", {
    available: true,
    categories: { $nin: ["World Cup Collection 26", "Psychowrld NSFW Collection"] },
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
// ─── COLLECTIONS PAGE 1 — fully dynamic, pulled from actual product tags ───
const sendCollections = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const collectionNames = (await Product.distinct("collections", { available: true })).filter((c) => c && c.trim());

  if (collectionNames.length === 0) {
    await sendText(to, "😔 No special collections are live right now — check back soon!");
    return await sendShopMenu(to, session);
  }

  const page1 = collectionNames.slice(0, 9);
  const hasMore = collectionNames.length > 9;

  const rows = page1.map((name) => ({
    id: `COLLECTION_${name.toUpperCase().replace(/\s/g, "_")}`,
    title: name.length > 24 ? name.substring(0, 24) : name,
    description: `Browse ${name}`,
  }));

  if (hasMore) {
    rows.push({ id: "MORE_COLLECTIONS", title: "➡️ More Collections", description: "See more" });
  }

  await sendList(to, "✨ Collections", "Our exclusive collections:", "View Collections", [
    { title: "Special Collections", rows },
  ]);
};

// ─── COLLECTIONS PAGE 2 ───
const sendMoreCollections = async (to, session) => {
  session.state = "BROWSING_CATEGORIES";
  await session.save();

  const collectionNames = (await Product.distinct("collections", { available: true })).filter((c) => c && c.trim());
  const page2 = collectionNames.slice(9);

  const rows = page2.map((name) => ({
    id: `COLLECTION_${name.toUpperCase().replace(/\s/g, "_")}`,
    title: name.length > 24 ? name.substring(0, 24) : name,
    description: `Browse ${name}`,
  }));

  rows.push({ id: "BROWSE_COLLECTIONS", title: "⬅️ Back", description: "Previous page" });

  await sendList(to, "✨ More Collections", "Select a collection:", "View Collections", [
    { title: "More Collections", rows },
  ]);
};

// ─── PRODUCTS WITHIN A COLLECTION ───
const sendCollectionProducts = async (to, session, collectionName) => {
  session.state = "BROWSING_ITEMS";
  await session.save();

  const products = await Product.find({ collections: collectionName, available: true });

  if (products.length === 0) {
    await sendText(to, `😔 No items in ${collectionName} right now.`);
    return await sendCollections(to, session);
  }

  const withImages = products.filter((p) => p.images && p.images.length > 0);

  if (withImages.length > 0 && CATALOG_ID) {
    const sectionsMap = {};
    withImages.forEach((p) => {
      const primaryCategory = (p.categories && p.categories[0]) || "Other";
      if (!sectionsMap[primaryCategory]) sectionsMap[primaryCategory] = [];
      sectionsMap[primaryCategory].push({ product_retailer_id: p._id.toString() });
    });

    const sections = Object.entries(sectionsMap)
      .slice(0, 10)
      .map(([title, product_items]) => ({ title, product_items: product_items.slice(0, 30) }));

    await sendProductList(
      to,
      `✨ ${collectionName}`,
      `Browse ${collectionName} below. Tap any product to view details and add to your cart.`,
      CATALOG_ID,
      sections
    );

    await sendButtons(to, "Need anything else?", [
      { id: "BROWSE_COLLECTIONS", title: "⬅️ Back" },
      { id: "VIEW_CART", title: "🛒 My Cart" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]);
    return;
  }

  const rows = products.slice(0, 9).map((p) => ({
    id: `ITEM_${p._id}`,
    title: p.name.length > 24 ? p.name.substring(0, 24) : p.name,
    description: `₦${p.price.toLocaleString()} • Sizes: ${p.sizes.join(", ")}`,
  }));

  rows.push({ id: "BROWSE_COLLECTIONS", title: "⬅️ Back", description: "Back to collections" });

  await sendList(to, `✨ ${collectionName}`, "Select an item to add to cart:", "View Items", [
    { title: collectionName, rows },
  ]);
};

// ─── SUBCATEGORIES ───
const sendSubcategories = async (to, session, categoryName) => {
  session.state = "BROWSING_SUBCATEGORIES";
  session.currentCategory = categoryName;
  await session.save();

  const productsInCategory = await Product.find({
    categories: categoryName,
    available: true,
  });

  if (productsInCategory.length === 0) {
    await sendText(to, `😔 Nothing in ${categoryName} right now.`);
    return await sendCategories(to, session);
  }

  const subcategories = [...new Set(
    productsInCategory.map((p) => {
      const sub = getSubcategoryForCategory(p, categoryName);
      return sub && sub.trim() ? sub : "General";
    })
  )];

  const hasImages = productsInCategory.some((p) => p.images && p.images.length > 0);

  if (hasImages && CATALOG_ID) {
    return await sendCategoryAsProductList(to, session, categoryName);
  }

  if (subcategories.length === 1) {
    const subValue = subcategories[0] === "General" ? "" : subcategories[0];
    return await sendItems(to, session, categoryName, subValue, subcategories[0]);
  }

  const rows = subcategories.slice(0, 9).map((sub) => ({
    id: `SUB_${categoryName.toUpperCase().replace(/\s/g, "_")}__${sub === "General" ? "NONE" : sub.toUpperCase().replace(/\s/g, "_")}`,
    title: sub.length > 24 ? sub.substring(0, 24) : sub,
    description: `View ${sub}`,
  }));

  rows.push({ id: "BROWSE_CATEGORIES", title: "⬅️ Back", description: "Back to categories" });

  await sendList(to, `📦 ${categoryName}`, "Select a subcategory:", "View Items", [
    { title: categoryName, rows },
  ]);
};

// ─── ITEMS IN SUBCATEGORY ───
const sendItems = async (to, session, categoryName, subcategoryName, displayLabel) => {
  const label = displayLabel || (subcategoryName ? subcategoryName : "General");
  session.state = "BROWSING_ITEMS";
  session.currentCategory = categoryName;
  session.currentSubcategory = subcategoryName;
  await session.save();

  const allInCategory = await Product.find({
    categories: categoryName,
    available: true,
  });

  const products = allInCategory
    .filter((p) => getSubcategoryForCategory(p, categoryName) === (subcategoryName || ""))
    .slice(0, 30);

  if (products.length === 0) {
    await sendText(to, `😔 No items in ${label} right now.`);
    return await sendSubcategories(to, session, categoryName);
  }

  const catId = `CAT_${categoryName.toUpperCase().replace(/\s/g, "_")}`;
  const withImages = products.filter((p) => p.images && p.images.length > 0);

  if (withImages.length > 0 && CATALOG_ID) {
    const productItems = withImages.map((p) => ({
      product_retailer_id: p._id.toString(),
    }));

    await sendProductList(
      to,
      `🛍️ ${label}`,
      `Browse items below. Tap a product to view details and add to your cart.`,
      CATALOG_ID,
      [{ title: label, product_items: productItems }]
    );

    await sendButtons(to, "Want to browse more?", [
      { id: catId, title: "⬅️ Back" },
      { id: "BROWSE_CATEGORIES", title: "📂 Categories" },
      { id: "VIEW_CART", title: "🛒 My Cart" },
    ]);
    return;
  }

  const rows = products.map((p) => {
    const badgeLabel = getBadgeLabel(p);
    const rawTitle = badgeLabel ? `${badgeLabel} ${p.name}` : p.name;
    return {
      id: `ITEM_${p._id}`,
      title: rawTitle.length > 24 ? rawTitle.substring(0, 24) : rawTitle,
      description: `₦${p.price.toLocaleString()} • Sizes: ${p.sizes.join(", ")}`,
    };
  });

  rows.push({ id: catId, title: "⬅️ Back", description: "Back to subcategories" });

  await sendList(to, `🛍️ ${label}`, "Select an item to add to cart:", "View Items", [
    { title: label, rows },
  ]);
};

// ─── SEND FULL CATEGORY WITH ALL SUBCATEGORIES ───
const sendCategoryAsProductList = async (to, session, categoryName) => {
  session.state = "BROWSING_ITEMS";
  session.currentCategory = categoryName;
  await session.save();

  const products = await Product.find({
    categories: categoryName,
    available: true,
  });

  if (products.length === 0) {
    await sendText(to, `😔 No items in ${categoryName} right now.`);
    return await sendCategories(to, session);
  }

  const sectionsMap = {};
  products.forEach((p) => {
    if (!p.images || p.images.length === 0) return;
    const sub = getSubcategoryForCategory(p, categoryName);
    const label = sub && sub.trim() ? sub : "General";
    if (!sectionsMap[label]) sectionsMap[label] = [];
    sectionsMap[label].push({ product_retailer_id: p._id.toString() });
  });

  const sections = Object.entries(sectionsMap)
    .slice(0, 10)
    .map(([title, product_items]) => ({ title, product_items: product_items.slice(0, 10) }));

  if (sections.length > 0 && CATALOG_ID) {
    await sendProductList(
      to,
      `🛍️ ${categoryName}`,
      `Browse all ${categoryName} items below. Tap any product to view and add to your cart.`,
      CATALOG_ID,
      sections
    );

    await sendButtons(to, "Need anything else?", [
      { id: "BROWSE_CATEGORIES", title: "📂 Categories" },
      { id: "VIEW_CART", title: "🛒 My Cart" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]);
  } else {
    return await sendSubcategories(to, session, categoryName);
  }
};

// ─── SEND ALL PRODUCTS ACROSS EVERY CATEGORY, PAGINATED ───
const sendAllProducts = async (to, session, page = 0) => {
  session.state = "BROWSING_ITEMS";
  await session.save();

  const allAvailable = await Product.find({ available: true }).sort({ categories: 1, name: 1 });

  if (allAvailable.length === 0) {
    await sendText(to, "😔 No products available right now.");
    return await sendShopMenu(to, session);
  }

  const withImages = allAvailable.filter((p) => p.images && p.images.length > 0);

  // Fallback to a plain text list if nothing has synced images yet
  if (withImages.length === 0 || !CATALOG_ID) {
    const pageSize = 9;
    const pageItems = allAvailable.slice(page * pageSize, page * pageSize + pageSize);
    const hasMore = allAvailable.length > (page + 1) * pageSize;

    const rows = pageItems.map((p) => ({
      id: `ITEM_${p._id}`,
      title: p.name.length > 24 ? p.name.substring(0, 24) : p.name,
      description: `₦${p.price.toLocaleString()} • ${(p.categories || []).join(", ")}`,
    }));

    if (hasMore) {
      rows.push({ id: `ALLPRODUCTS_PAGE_${page + 1}`, title: "➡️ More Products", description: "See more" });
    }
    rows.push({ id: "MAIN_SHOP", title: "⬅️ Back", description: "Back to menu" });

    return await sendList(to, "🛍️ All Products", "Browse everything we have:", "View Products", [
      { title: "All Products", rows },
    ]);
  }

  // Meta caps multi-product messages at 30 items total — paginate if the store has more
  const pageSize = 30;
  const pageProducts = withImages.slice(page * pageSize, page * pageSize + pageSize);
  const hasMore = withImages.length > (page + 1) * pageSize;

  const sectionsMap = {};
  pageProducts.forEach((p) => {
    const primaryCategory = (p.categories && p.categories[0]) || "Other";
    if (!sectionsMap[primaryCategory]) sectionsMap[primaryCategory] = [];
    sectionsMap[primaryCategory].push({ product_retailer_id: p._id.toString() });
  });

  const sections = Object.entries(sectionsMap)
    .slice(0, 10)
    .map(([title, product_items]) => ({ title, product_items }));

  await sendProductList(
    to,
    "🛍️ All Products",
    "Browse everything we have. Tap any product to view details and add to your cart.",
    CATALOG_ID,
    sections
  );

  const buttons = [];
  if (hasMore) buttons.push({ id: `ALLPRODUCTS_PAGE_${page + 1}`, title: "➡️ More Products" });
  buttons.push({ id: "BROWSE_CATEGORIES", title: "📂 Categories" });
  buttons.push({ id: "VIEW_CART", title: "🛒 My Cart" });

  await sendButtons(to, "Need anything else?", buttons.slice(0, 3));
};

// ─── ADD TO CART ───
const addToCart = async (to, session, productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    await sendText(to, "❌ Item not found.");
    return;
  }

  session.pendingProductId = productId.toString();
  session.pendingSize = null;
  session.pendingColor = null;
  session.pendingAttributes = {};
  session.pendingAttributeIndex = 0;
  await session.save();

  if (product.sizes && product.sizes.length > 0 && product.sizes[0] !== "One Size") {
    session.state = "AWAITING_SIZE";
    await session.save();

    const sizeRows = product.sizes.map((s) => ({
      id: `SIZE_${productId}__${s.replace(/\s/g, "_")}`,
      title: s.length > 24 ? s.substring(0, 24) : s,
      description: `Size ${s}`,
    }));
    sizeRows.push({ id: `SIZE_${productId}__CUSTOM`, title: "📝 Custom Size", description: "Enter your own size" });

    await sendList(
      to,
      `📏 Select Size`,
      `*${product.name}* — ₦${product.price.toLocaleString()}\n\nChoose your size:`,
      "Select Size",
      [{ title: "Available Sizes", rows: sizeRows }]
    );
    return;
  }

  // No preset sizes — still offer the customer a chance to specify one
  session.state = "OFFER_CUSTOM_SIZE";
  await session.save();

  await sendButtons(
    to,
    `*${product.name}* — ₦${product.price.toLocaleString()}\n\nDo you need a specific size?`,
    [
      { id: `OFFERSIZE_${productId}`, title: "📝 Enter Size" },
      { id: `SKIPSIZE_${productId}`, title: "⏭️ Skip" },
    ]
  );
};
// ─── ASK COLOR ───
const askColor = async (to, session, product, size) => {
  session.pendingSize = size;
  await session.save();

  if (product.colors && product.colors.length > 0) {
    session.state = "AWAITING_COLOR";
    await session.save();

    const colorRows = product.colors.map((c) => ({
      id: `COLOR_${product._id}__${c.replace(/\s/g, "_")}`,
      title: c.length > 24 ? c.substring(0, 24) : c,
      description: `Color: ${c}`,
    }));
    colorRows.push({ id: `COLOR_${product._id}__CUSTOM`, title: "📝 Custom Color", description: "Enter your own color" });

    await sendList(
      to,
      `🎨 Select Color`,
      `*${product.name}* (${size})\n\nChoose your color:`,
      "Select Color",
      [{ title: "Available Colors", rows: colorRows }]
    );
    return;
  }

 // No preset colors — still offer the customer a chance to specify one
 session.state = "OFFER_CUSTOM_COLOR";
 await session.save();

 await sendButtons(
   to,
   `*${product.name}* (${size})\n\nDo you need a specific color?`,
   [
     { id: `OFFERCOLOR_${product._id}`, title: "📝 Enter Color" },
     { id: `SKIPCOLOR_${product._id}`, title: "⏭️ Skip" },
   ]
 );
};
// ─── ASK CUSTOM ATTRIBUTES (e.g. Fan vs Player version) — loops through each defined attribute in order ───
const askCustomAttributes = async (to, session, product, size, color, attrIndex) => {
  const attrs = product.customAttributes || [];

  if (attrIndex >= attrs.length) {
    return await doAddToCart(to, session, product, size, color);
  }

  const attr = attrs[attrIndex];
  session.state = "AWAITING_CUSTOM_ATTRIBUTE";
  session.pendingProductId = product._id.toString();
  session.pendingSize = size;
  session.pendingColor = color;
  session.pendingAttributeIndex = attrIndex;
  await session.save();

  const rows = attr.options.map((rawOpt) => {
    const opt = typeof rawOpt === "string" ? { value: rawOpt, priceAdjustment: 0 } : rawOpt;
    const priceNote = opt.priceAdjustment ? `+₦${opt.priceAdjustment.toLocaleString()}` : `${attr.name}: ${opt.value}`;
    return {
      id: `ATTR_${product._id}__${attrIndex}__${opt.value.replace(/\s/g, "_")}`,
      title: opt.value.length > 24 ? opt.value.substring(0, 24) : opt.value,
      description: priceNote,
    };
  });

  await sendList(
    to,
    `⚙️ Select ${attr.name}`,
    `*${product.name}*\n\nChoose your ${attr.name}:`,
    `Select ${attr.name}`,
    [{ title: attr.name, rows }]
  );
};

// ─── ADD TO CART (supports quantity + native catalog order queue) ───
const doAddToCart = async (to, session, product, size, color) => {
  const colorLabel = color ? ` / ${color}` : "";
  const attrValues = session.pendingAttributes ? Object.values(session.pendingAttributes) : [];
  const attrLabel = attrValues.length > 0 ? ` / ${attrValues.join(" / ")}` : "";

  // Add up any price adjustments from selected custom attributes (e.g. Player version = +₦10,000)
  let attrPriceAdjustment = 0;
  if (product.customAttributes && session.pendingAttributes) {
    for (const attr of product.customAttributes) {
      const selectedValue = session.pendingAttributes[attr.name];
      if (!selectedValue) continue;
      const match = attr.options.find((rawOpt) => {
        const opt = typeof rawOpt === "string" ? { value: rawOpt } : rawOpt;
        return opt.value === selectedValue;
      });
      if (match && typeof match !== "string" && match.priceAdjustment) {
        attrPriceAdjustment += match.priceAdjustment;
      }
    }
  }

  const finalPrice = product.price + attrPriceAdjustment;
  const cartKey = `${product._id}_${size}_${color || ""}_${JSON.stringify(session.pendingAttributes || {})}`;
  const quantity = session.pendingQuantity || 1;
  const existing = session.cart.find((i) => i.productId === cartKey);

  if (existing) {
    existing.quantity += quantity;
  } else {
    session.cart.push({
      productId: cartKey,
      name: `${product.name} (${size}${colorLabel}${attrLabel})`,
      price: finalPrice,
      quantity,
    });
  }

  session.pendingProductId = null;
  session.pendingSize = null;
  session.pendingColor = null;
  session.pendingQuantity = null;
  session.pendingAttributes = {};
  session.pendingAttributeIndex = 0;

  if (session.orderQueue && session.orderQueue.length > 0) {
    session.orderQueue.shift();
    session.state = "PROCESSING_ORDER_QUEUE";
    await session.save();
    return await processNextInQueue(to, session);
  }

  session.state = "BROWSING_ITEMS";
  await session.save();

  const catId = `CAT_${(session.currentCategory || "").toUpperCase().replace(/\s/g, "_")}`;

  await sendButtons(
    to,
    `✅ *${product.name} (${size}${colorLabel}${attrLabel})* added to cart!\n\n💰 ₦${finalPrice.toLocaleString()}\n🛒 ${session.cart.length} item(s) in cart`,
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

// ─── HANDLE NATIVE WHATSAPP CART ORDER ───
const handleOrderMessage = async (to, order, session) => {
  const items = order.product_items || [];
  if (items.length === 0) {
    await sendText(to, "❌ Couldn't read your cart. Type *hi* to browse again.");
    return;
  }

  // Expand each item by quantity so we ask size/color per unit
  // e.g. 2x Hoodie → two separate queue entries, each asked independently
  const expandedQueue = [];
  for (const i of items) {
    const qty = parseInt(i.quantity) || 1;
    for (let u = 0; u < qty; u++) {
      expandedQueue.push({ productId: i.product_retailer_id, quantity: 1 });
    }
  }

  session.orderQueue = expandedQueue;
  session.cart = [];
  session.state = "PROCESSING_ORDER_QUEUE";
  await session.save();

  const totalUnits = expandedQueue.length;
  await sendText(
    to,
    `🛒 Got your cart with ${totalUnits} item${totalUnits > 1 ? "s" : ""}!\n\nI'll ask for size and color for each one — even if they're the same product, each unit can have different details.`
  );
  await processNextInQueue(to, session);
};

const processNextInQueue = async (to, session) => {
  if (!session.orderQueue || session.orderQueue.length === 0) {
    session.state = "CART";
    await session.save();
    return await sendCartSummary(to, session);
  }

  const next = session.orderQueue[0];
  const product = await Product.findById(next.productId);

  if (!product) {
    session.orderQueue.shift();
    await session.save();
    return await processNextInQueue(to, session);
  }

  session.pendingQuantity = 1;
  await session.save();
  await addToCart(to, session, next.productId.toString());
};

// ─── CUSTOM ORDER ───
const sendCustomOrderPrompt = async (to, session) => {
  session.state = "CUSTOM_ORDER_MODE";
  await session.save();

  await sendText(
    to,
    `✍️ *Custom Order*\n\nTell us exactly what you'd like — item type, size, color, and any special design details.\n\nOnce you send it, our team will review and get back to you with pricing and timeline.`
  );
};

// ─── WEBSITE LINK ───
const sendWebsiteLink = async (to, session) => {
  session.state = "IDLE";
  await session.save();

  await sendButtons(
    to,
    `🌐 *Visit our website:*\n\nhttps://psychowrld.co\n\nBrowse our full collection, lookbooks, and more!`,
    [
      { id: "MAIN_SHOP", title: "🛒 Shop Now" },
      { id: "TALK_AGENT", title: "💬 Talk to Agent" },
    ]
  );
};

module.exports = {
  askCustomAttributes,
  sendAllProducts,
  sendCollections,
  sendMoreCollections,
  sendCollectionProducts,
  sendWelcomeMenu,
  sendShopMenu,
  sendCategories,
  sendMoreCategories,
  sendSubcategories,
  sendCategoryAsProductList,
  sendItems,
  addToCart,
  doAddToCart,
  askColor,
  sendCartSummary,
  sendEditOrder,
  removeFromCart,
  askDeliveryAddress,
  confirmOrderWithAddress,
  trackOrder,
  sendManufacturingEnquiry,
  sendManufacturingRedirect,
  handleOrderMessage,
  sendCustomOrderPrompt,
  sendWebsiteLink,
};