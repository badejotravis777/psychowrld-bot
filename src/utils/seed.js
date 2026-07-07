require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product.model");

const clothSizes = ["S", "M", "L", "XL"];
const shoeSizes = ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];
const oneSize = ["One Size"];

const products = [
  // ─── FOOTBALL ───
  { name: "Home Jersey", category: "Football", subcategory: "Jerseys", price: 40000, emoji: "⚽", sizes: clothSizes, description: "Psychowrld home football jersey" },
  { name: "Away Jersey", category: "Football", subcategory: "Jerseys", price: 40000, emoji: "⚽", sizes: clothSizes, description: "Psychowrld away football jersey" },
  { name: "Training Jersey", category: "Football", subcategory: "Jerseys", price: 35000, emoji: "⚽", sizes: clothSizes, description: "Lightweight training jersey" },
  { name: "Firm Ground Boots", category: "Football", subcategory: "Football Boots", price: 45000, emoji: "👟", sizes: shoeSizes, description: "FG football boots" },
  { name: "Soft Ground Boots", category: "Football", subcategory: "Football Boots", price: 48000, emoji: "👟", sizes: shoeSizes, description: "SG football boots" },
  { name: "Slip-In Shin Guards", category: "Football", subcategory: "Shin Guards", price: 6000, emoji: "🦵", sizes: ["S", "M", "L"], description: "Lightweight slip-in shin guards" },
  { name: "Ankle Shin Guards", category: "Football", subcategory: "Shin Guards", price: 7500, emoji: "🦵", sizes: ["S", "M", "L"], description: "Ankle protection shin guards" },
  { name: "Football Socks", category: "Football", subcategory: "Socks", price: 3000, emoji: "🧦", sizes: clothSizes, description: "Performance football socks" },
  { name: "Grip Socks", category: "Football", subcategory: "Socks", price: 4500, emoji: "🧦", sizes: clothSizes, description: "Anti-slip grip socks" },
  { name: "Training Kit Set", category: "Football", subcategory: "Training Kits", price: 65000, emoji: "🎽", sizes: clothSizes, description: "Full jersey + shorts training kit" },
  { name: "Match Ball", category: "Football", subcategory: "Footballs", price: 18000, emoji: "⚽", sizes: oneSize, description: "FIFA approved match ball" },
  { name: "Training Ball", category: "Football", subcategory: "Footballs", price: 12000, emoji: "⚽", sizes: oneSize, description: "Durable training ball" },

  // ─── BASKETBALL ───
  { name: "Home Jersey", category: "Basketball", subcategory: "Jerseys", price: 22000, emoji: "🏀", sizes: clothSizes, description: "Mesh basketball home jersey" },
  { name: "Away Jersey", category: "Basketball", subcategory: "Jerseys", price: 22000, emoji: "🏀", sizes: clothSizes, description: "Mesh basketball away jersey" },
  { name: "Basketball Shorts", category: "Basketball", subcategory: "Shorts", price: 15000, emoji: "🩳", sizes: clothSizes, description: "Loose fit mesh shorts" },
  { name: "High-Top Shoes", category: "Basketball", subcategory: "Basketball Shoes", price: 55000, emoji: "👟", sizes: shoeSizes, description: "High-top basketball shoes" },
  { name: "Low-Top Shoes", category: "Basketball", subcategory: "Basketball Shoes", price: 48000, emoji: "👟", sizes: shoeSizes, description: "Low-top basketball shoes" },
  { name: "Shooting Sleeve", category: "Basketball", subcategory: "Accessories", price: 5000, emoji: "💪", sizes: ["S/M", "L/XL"], description: "Compression shooting sleeve" },
  { name: "Headband", category: "Basketball", subcategory: "Accessories", price: 3000, emoji: "🎽", sizes: oneSize, description: "Moisture-wicking headband" },
  { name: "Match Basketball", category: "Basketball", subcategory: "Basketballs", price: 22000, emoji: "🏀", sizes: oneSize, description: "Official size match ball" },

  // ─── RUNNING ───
  { name: "Road Running Shoes", category: "Running", subcategory: "Running Shoes", price: 45000, emoji: "👟", sizes: shoeSizes, description: "Cushioned road running shoes" },
  { name: "Trail Running Shoes", category: "Running", subcategory: "Running Shoes", price: 48000, emoji: "👟", sizes: shoeSizes, description: "Grip trail running shoes" },
  { name: "Performance Running Shirt", category: "Running", subcategory: "Performance Shirts", price: 15000, emoji: "👕", sizes: clothSizes, description: "Lightweight running shirt" },
  { name: "Running Shorts", category: "Running", subcategory: "Running Shorts", price: 12000, emoji: "🩳", sizes: clothSizes, description: "Split-hem running shorts" },
  { name: "Windbreaker Jacket", category: "Running", subcategory: "Windbreakers", price: 35000, emoji: "🧥", sizes: clothSizes, description: "Packable windbreaker jacket" },
  { name: "2-Bottle Hydration Belt", category: "Running", subcategory: "Hydration Belts", price: 8000, emoji: "💧", sizes: oneSize, description: "Running hydration belt" },
  { name: "Running Cap", category: "Running", subcategory: "Running Caps", price: 6000, emoji: "🧢", sizes: oneSize, description: "Moisture-wicking running cap" },
  { name: "Compression Tights", category: "Running", subcategory: "Compression Wear", price: 18000, emoji: "🩱", sizes: clothSizes, description: "Full leg compression tights" },

  // ─── GYM & TRAINING ───
  { name: "Compression Top", category: "Gym & Training", subcategory: "Compression Tops", price: 14000, emoji: "💪", sizes: clothSizes, description: "Short sleeve compression top" },
  { name: "Training Shorts", category: "Gym & Training", subcategory: "Training Shorts", price: 12000, emoji: "🩳", sizes: clothSizes, description: "Flexible training shorts" },
  { name: "Training Joggers", category: "Gym & Training", subcategory: "Joggers", price: 18000, emoji: "👖", sizes: clothSizes, description: "Tapered training joggers" },
  { name: "Gym Hoodie", category: "Gym & Training", subcategory: "Hoodies", price: 25000, emoji: "🖤", sizes: clothSizes, description: "Premium gym hoodie" },
  { name: "Duffel Bag", category: "Gym & Training", subcategory: "Gym Bags", price: 22000, emoji: "🎒", sizes: oneSize, description: "45L gym duffel bag" },
  { name: "Weightlifting Gloves", category: "Gym & Training", subcategory: "Gloves", price: 7000, emoji: "🧤", sizes: ["S", "M", "L", "XL"], description: "Padded lifting gloves" },
  { name: "Resistance Band Set", category: "Gym & Training", subcategory: "Resistance Bands", price: 5000, emoji: "🔴", sizes: oneSize, description: "5-band resistance set" },
  { name: "Insulated Water Bottle", category: "Gym & Training", subcategory: "Water Bottles", price: 4000, emoji: "💧", sizes: oneSize, description: "700ml insulated bottle" },

  // ─── SKATEBOARDING ───
  { name: "Vulc Skate Shoes", category: "Skateboarding", subcategory: "Skate Shoes", price: 35000, emoji: "👟", sizes: shoeSizes, description: "Vulcanized sole skate shoes" },
  { name: "Cupsole Skate Shoes", category: "Skateboarding", subcategory: "Skate Shoes", price: 38000, emoji: "👟", sizes: shoeSizes, description: "Cupsole skate shoes" },
  { name: "Oversized Graphic Tee", category: "Skateboarding", subcategory: "Oversized T-Shirts", price: 12000, emoji: "👕", sizes: clothSizes, description: "Oversized skate graphic tee" },
  { name: "Cargo Pants", category: "Skateboarding", subcategory: "Cargo Pants", price: 22000, emoji: "👖", sizes: clothSizes, description: "Relaxed fit cargo pants" },
  { name: "Skate Denim", category: "Skateboarding", subcategory: "Denim", price: 25000, emoji: "👖", sizes: clothSizes, description: "Stretch skate denim" },
  { name: "Skate Hoodie", category: "Skateboarding", subcategory: "Hoodies", price: 25000, emoji: "🖤", sizes: clothSizes, description: "Classic skate hoodie" },
  { name: "Flannel Shirt", category: "Skateboarding", subcategory: "Flannels", price: 18000, emoji: "🟥", sizes: clothSizes, description: "Oversized flannel shirt" },
  { name: "Complete Skate Deck", category: "Skateboarding", subcategory: "Skate Decks", price: 28000, emoji: "🛹", sizes: oneSize, description: "Complete skateboard deck" },
  { name: "Premium Grip Tape", category: "Skateboarding", subcategory: "Grip Tape", price: 3000, emoji: "🛹", sizes: oneSize, description: "9x33 grip tape sheet" },
  { name: "Skate Wheels Set", category: "Skateboarding", subcategory: "Skate Wheels", price: 12000, emoji: "⚪", sizes: oneSize, description: "Set of 4 wheels 52mm" },
  { name: "ABEC-9 Bearings", category: "Skateboarding", subcategory: "Bearings", price: 5000, emoji: "⚙️", sizes: oneSize, description: "ABEC-9 precision bearings" },
  { name: "Skate Helmet", category: "Skateboarding", subcategory: "Helmets", price: 15000, emoji: "⛑️", sizes: ["S", "M", "L"], description: "Certified skate helmet" },
  { name: "Knee Pads", category: "Skateboarding", subcategory: "Knee Pads", price: 8000, emoji: "🦵", sizes: ["S", "M", "L"], description: "Impact protection knee pads" },
  { name: "Elbow Pads", category: "Skateboarding", subcategory: "Elbow Pads", price: 7000, emoji: "💪", sizes: ["S", "M", "L"], description: "Impact protection elbow pads" },
  { name: "Skate Backpack", category: "Skateboarding", subcategory: "Skate Backpacks", price: 20000, emoji: "🎒", sizes: oneSize, description: "Backpack with deck straps" },

  // ─── STREETWEAR ───
  { name: "Graphic T-Shirt", category: "Streetwear", subcategory: "Graphic T-Shirts", price: 12000, emoji: "👕", sizes: clothSizes, description: "Psychowrld graphic tee" },
  { name: "Pullover Hoodie", category: "Streetwear", subcategory: "Hoodies", price: 28000, emoji: "🖤", sizes: clothSizes, description: "Premium pullover hoodie" },
  { name: "Zip-Up Hoodie", category: "Streetwear", subcategory: "Hoodies", price: 30000, emoji: "🖤", sizes: clothSizes, description: "Premium zip-up hoodie" },
  { name: "Crewneck Sweatshirt", category: "Streetwear", subcategory: "Sweatshirts", price: 22000, emoji: "👕", sizes: clothSizes, description: "Heavy cotton crewneck" },
  { name: "Wide Leg Cargo", category: "Streetwear", subcategory: "Cargo Pants", price: 25000, emoji: "👖", sizes: clothSizes, description: "Wide leg cargo trousers" },
  { name: "Baggy Denim", category: "Streetwear", subcategory: "Denim", price: 28000, emoji: "👖", sizes: clothSizes, description: "Baggy fit denim jeans" },
  { name: "Varsity Jacket", category: "Streetwear", subcategory: "Varsity Jackets", price: 45000, emoji: "🧥", sizes: clothSizes, description: "Classic varsity jacket" },
  { name: "Satin Bomber Jacket", category: "Streetwear", subcategory: "Bomber Jackets", price: 40000, emoji: "🧥", sizes: clothSizes, description: "Satin bomber jacket" },
  { name: "Mesh Jersey", category: "Streetwear", subcategory: "Jerseys", price: 20000, emoji: "🎽", sizes: clothSizes, description: "Streetwear mesh jersey" },
  { name: "Snapback Cap", category: "Streetwear", subcategory: "Accessories", price: 8000, emoji: "🧢", sizes: oneSize, description: "Psychowrld snapback cap" },

  // ─── EVERYDAY LIFESTYLE ───
  { name: "Classic Sneakers", category: "Everyday Lifestyle", subcategory: "Sneakers", price: 35000, emoji: "👟", sizes: shoeSizes, description: "Everyday classic sneakers" },
  { name: "Comfort Slides", category: "Everyday Lifestyle", subcategory: "Slides", price: 12000, emoji: "🩴", sizes: shoeSizes, description: "Foam comfort slides" },
  { name: "Tote Bag", category: "Everyday Lifestyle", subcategory: "Bags", price: 12000, emoji: "👜", sizes: oneSize, description: "Canvas logo tote bag" },
  { name: "Crossbody Bag", category: "Everyday Lifestyle", subcategory: "Bags", price: 18000, emoji: "👜", sizes: oneSize, description: "Everyday crossbody bag" },
  { name: "Slim Wallet", category: "Everyday Lifestyle", subcategory: "Wallets", price: 8000, emoji: "👛", sizes: oneSize, description: "Slim leather wallet" },
  { name: "Logo Cap", category: "Everyday Lifestyle", subcategory: "Caps", price: 7000, emoji: "🧢", sizes: oneSize, description: "Everyday logo cap" },
  { name: "Socks 3-Pack", category: "Everyday Lifestyle", subcategory: "Socks", price: 3000, emoji: "🧦", sizes: clothSizes, description: "Pack of 3 crew socks" },
  { name: "Chain Necklace", category: "Everyday Lifestyle", subcategory: "Jewelry", price: 15000, emoji: "💍", sizes: oneSize, description: "Psychowrld chain necklace" },
  { name: "Signature Fragrance", category: "Everyday Lifestyle", subcategory: "Fragrance", price: 25000, emoji: "🌸", sizes: oneSize, description: "Psychowrld signature scent" },

  // ─── WORLD CUP COLLECTION 26 ───
  { name: "Nigeria Home Jersey 24", category: "World Cup Collection 26", subcategory: "Nigeria Jersey 24", price: 40000, emoji: "🇳🇬", sizes: clothSizes, description: "Nigeria 2024 home jersey" },
  { name: "Nigeria Away Jersey 24", category: "World Cup Collection 26", subcategory: "Nigeria Jersey 24", price: 40000, emoji: "🇳🇬", sizes: clothSizes, description: "Nigeria 2024 away jersey" },
  { name: "Psychowrld Team Jersey 24", category: "World Cup Collection 26", subcategory: "Psychowrld Team Jersey 24", price: 40000, emoji: "⚽", sizes: clothSizes, description: "Psychowrld team jersey 2024" },
  { name: "Butterfly Jersey 25", category: "World Cup Collection 26", subcategory: "Psychowrld Butterfly Jersey 25", price: 42000, emoji: "🦋", sizes: clothSizes, description: "Limited edition butterfly jersey" },
  { name: "World Cup Training Shorts", category: "World Cup Collection 26", subcategory: "Psychowrld Team Jersey 24", price: 18000, emoji: "🩳", sizes: clothSizes, description: "World Cup collection shorts" },

  // ─── PSYCHOWRLD NSFW COLLECTION ───
  { name: "NSFW Graphic Tee", category: "Psychowrld NSFW Collection", subcategory: "T-Shirts", price: 18000, emoji: "🔞", sizes: clothSizes, description: "NSFW collection graphic tee" },
  { name: "NSFW Hoodie", category: "Psychowrld NSFW Collection", subcategory: "Hoodies", price: 32000, emoji: "🔞", sizes: clothSizes, description: "NSFW collection hoodie" },
  { name: "NSFW Shorts", category: "Psychowrld NSFW Collection", subcategory: "Shorts", price: 15000, emoji: "🔞", sizes: clothSizes, description: "NSFW collection shorts" },
  { name: "NSFW Cap", category: "Psychowrld NSFW Collection", subcategory: "Accessories", price: 9000, emoji: "🔞", sizes: oneSize, description: "NSFW collection cap" },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  await Product.deleteMany({});
  console.log("🗑️ Cleared existing products");

  await Product.insertMany(products);

  const cats = [...new Set(products.map((p) => p.category))];
  console.log(`✅ Seeded ${products.length} products across ${cats.length} categories`);
  console.log("Categories:", cats.join(", "));

  await mongoose.disconnect();
  console.log("👋 Done!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
