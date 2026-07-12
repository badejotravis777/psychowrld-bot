const axios = require("axios");
const { ACCESS_TOKEN, API_URL } = require("../config/whatsapp.config");

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN || ACCESS_TOKEN}`,
  "Content-Type": "application/json",
});

// Send plain text message
const sendText = async (to, text) => {
  try {
    await axios.post(API_URL, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }, { headers: getHeaders() });
  } catch (err) {
    console.error("❌ sendText error:", err.response?.data || err.message);
  }
};

// Send interactive button message (max 3 buttons)
const sendButtons = async (to, bodyText, buttons) => {
  try {
    await axios.post(API_URL, {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    }, { headers: getHeaders() });
  } catch (err) {
    console.error("❌ sendButtons error:", err.response?.data || err.message);
  }
};

// Send interactive list message (for menus/categories)
const sendList = async (to, headerText, bodyText, buttonLabel, sections) => {
  try {
    await axios.post(API_URL, {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        action: { button: buttonLabel, sections },
      },
    }, { headers: getHeaders() });
  } catch (err) {
    console.error("❌ sendList error:", err.response?.data || err.message);
  }
};

// Send multi-product message — shows real product images inline in chat
const sendProductList = async (to, headerText, bodyText, catalogId, sections) => {
  try {
    await axios.post(API_URL, {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "product_list",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        footer: { text: "Psychowrld Luxury Wears" },
        action: { catalog_id: catalogId, sections },
      },
    }, { headers: getHeaders() });
  } catch (err) {
    console.error("❌ sendProductList error:", err.response?.data || err.message);
  }
};

// Send single product message
const sendProduct = async (to, catalogId, productRetailerId) => {
  try {
    await axios.post(API_URL, {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "product",
        body: { text: "Tap to view product details and add to your WhatsApp cart." },
        action: { catalog_id: catalogId, product_retailer_id: productRetailerId },
      },
    }, { headers: getHeaders() });
  } catch (err) {
    console.error("❌ sendProduct error:", err.response?.data || err.message);
  }
};

module.exports = { sendText, sendButtons, sendList, sendProductList, sendProduct };