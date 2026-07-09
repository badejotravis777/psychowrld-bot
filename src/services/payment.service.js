const axios = require("axios");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Initialize a Paystack payment and return the checkout URL
const initializePayment = async (email, amount, orderId, customerPhone) => {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email || `${customerPhone}@psychowrld.com`,
        amount: amount * 100, // Paystack uses kobo
        reference: `PWD-${orderId}-${Date.now()}`,
        callback_url: `${process.env.APP_URL}/payment/callback`,
        metadata: {
          orderId,
          customerPhone,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId,
            },
            {
              display_name: "Customer Phone",
              variable_name: "customer_phone",
              value: customerPhone,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      paymentUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
    };
  } catch (err) {
    console.error("❌ Paystack init error:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

// Verify a payment by reference
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const data = response.data.data;
    return {
      success: data.status === "success",
      amount: data.amount / 100,
      reference: data.reference,
      metadata: data.metadata,
    };
  } catch (err) {
    console.error("❌ Paystack verify error:", err.response?.data || err.message);
    return { success: false };
  }
};

module.exports = { initializePayment, verifyPayment };