module.exports = {
  VERIFY_TOKEN: process.env.META_VERIFY_TOKEN,
  ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID,
  API_URL: `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
};
