// Delivery calculator
// Currently uses zone-based pricing by state/city
// Can be swapped for GIG Logistics / Kwik API later

const DELIVERY_ZONES = {
  // Lagos zones
  lagos_island: { areas: ["lekki", "vi", "victoria island", "ikoyi", "ajah", "lagos island", "eti-osa"], fee: 2000 },
  lagos_mainland: { areas: ["ikeja", "surulere", "yaba", "maryland", "ogba", "agege", "mushin", "oshodi", "isolo", "alimosho", "ikorodu", "badagry"], fee: 2500 },
  
  // Southwest
  southwest: { areas: ["ibadan", "abeokuta", "ijebu", "sagamu", "akure", "ado ekiti", "osogbo", "ile ife", "ondo"], fee: 4000 },
  
  // Southeast
  southeast: { areas: ["enugu", "onitsha", "nnewi", "awka", "aba", "umuahia", "abakaliki", "owerri", "orlu"], fee: 5500 },
  
  // South South
  southsouth: { areas: ["port harcourt", "ph", "warri", "benin", "calabar", "uyo", "asaba", "yenagoa", "effurun"], fee: 5000 },
  
  // North
  north: { areas: ["abuja", "fct", "kano", "kaduna", "zaria", "jos", "maiduguri", "sokoto", "katsina", "gusau", "ilorin", "lokoja"], fee: 6000 },
  
  // Far North
  far_north: { areas: ["maiduguri", "damaturu", "gombe", "bauchi", "dutse", "birnin kebbi", "yelwa", "talata mafara"], fee: 7500 },
};

const DEFAULT_FEE = 6000; // default if location not matched

const calculateDelivery = async (address) => {
  const lower = address.toLowerCase();

  for (const [zone, data] of Object.entries(DELIVERY_ZONES)) {
    for (const area of data.areas) {
      if (lower.includes(area)) {
        console.log(`📍 Delivery zone matched: ${zone} — ₦${data.fee}`);
        return data.fee;
      }
    }
  }

  console.log(`📍 No zone matched for "${address}" — using default ₦${DEFAULT_FEE}`);
  return DEFAULT_FEE;
};

module.exports = { calculateDelivery };
