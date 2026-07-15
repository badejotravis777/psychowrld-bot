const axios = require("axios");
const DeliverySettings = require("../models/deliverySettings.model");

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

let cachedSettings = null;
let cachedSettingsAt = 0;
const SETTINGS_CACHE_MS = 60 * 1000; // re-read from DB every 60s so admin changes take effect quickly

const getSettings = async () => {
  const now = Date.now();
  if (cachedSettings && now - cachedSettingsAt < SETTINGS_CACHE_MS) return cachedSettings;

  let settings = await DeliverySettings.findOne();
  if (!settings) {
    settings = await DeliverySettings.create({
      storeAddress: "No 3 Nathan Street, Off Ojuelegba Road, Surulere, Lagos, Nigeria",
    });
  }
  cachedSettings = settings;
  cachedSettingsAt = now;
  return settings;
};

// Geocode any address string to real coordinates using Mapbox
const geocodeAddress = async (address, countryCode = "ng") => {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`;
    const res = await axios.get(url, {
      params: { access_token: MAPBOX_TOKEN, country: countryCode, limit: 1 },
    });

    const feature = res.data?.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    return { lat, lng, placeName: feature.place_name };
  } catch (err) {
    console.error("❌ Mapbox geocode error:", err.response?.data || err.message);
    return null;
  }
};

// Geocode the store address once, then cache the coordinates on the settings document itself
const getStoreCoords = async () => {
  const settings = await getSettings();

  if (settings.storeLat && settings.storeLng) {
    return { lat: settings.storeLat, lng: settings.storeLng };
  }

  const geocoded = await geocodeAddress(settings.storeAddress, "ng");
  if (!geocoded) {
    console.error("❌ Could not geocode store address:", settings.storeAddress);
    return null;
  }

  settings.storeLat = geocoded.lat;
  settings.storeLng = geocoded.lng;
  await settings.save();
  cachedSettings = settings;

  return { lat: geocoded.lat, lng: geocoded.lng };
};

// Real driving distance in km between two coordinate pairs, via Mapbox
const getDrivingDistanceKm = async (origin, destination) => {
  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}`;
    const res = await axios.get(url, {
      params: { access_token: MAPBOX_TOKEN, annotations: "distance" },
    });

    // Full matrix requested (no sources/destinations restriction) — [0][1] is store → customer
    const meters = res.data?.distances?.[0]?.[1];
    return meters == null ? null : meters / 1000;
  } catch (err) {
    console.error("❌ Mapbox distance matrix error:", err.response?.data || err.message);
    return null;
  }
};

// ─── DOMESTIC: geocode + real driving distance + admin-configured formula ───
const calculateDomesticDelivery = async (address) => {
  const settings = await getSettings();

  const storeCoords = await getStoreCoords();
  if (!storeCoords) return { success: false, reason: "store_geocode_failed" };

  const customerGeocode = await geocodeAddress(address, "ng");
  if (!customerGeocode) return { success: false, reason: "address_not_found" };

  const distanceKm = await getDrivingDistanceKm(storeCoords, { lat: customerGeocode.lat, lng: customerGeocode.lng });
  if (distanceKm == null) return { success: false, reason: "distance_failed" };

  const rawFee = settings.baseFee + distanceKm * settings.ratePerKm;
  const fee = Math.min(Math.max(rawFee, settings.minFee), settings.maxFee);

  return {
    success: true,
    fee: Math.round(fee),
    distanceKm: Math.round(distanceKm * 10) / 10,
    resolvedAddress: customerGeocode.placeName,
  };
};

// ─── INTERNATIONAL: flat rate per admin-defined region ───
const calculateInternationalDelivery = async (countryName) => {
  const settings = await getSettings();
  const lower = countryName.trim().toLowerCase();

  for (const region of settings.internationalRegions) {
    if (region.countries.some((c) => c.toLowerCase() === lower)) {
      return { success: true, fee: region.fee, region: region.name };
    }
  }

  return { success: false, reason: "no_region_match" };
};

module.exports = { calculateDomesticDelivery, calculateInternationalDelivery, geocodeAddress };