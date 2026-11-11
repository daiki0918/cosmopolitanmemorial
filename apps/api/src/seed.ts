// Dev seed: one super admin from env vars and the public branch directory.
import mongoose from "mongoose";
import argon2 from "argon2";
import { User, Branch } from "./models/index.js";
const { MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) throw new Error("Set MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD");
await mongoose.connect(MONGODB_URI);
const admin = await User.findOneAndUpdate({ email: SEED_ADMIN_EMAIL.toLowerCase() },
  { $setOnInsert: { name: "Super Admin", role: "super_admin", passwordHash: await argon2.hash(SEED_ADMIN_PASSWORD, { type: argon2.argon2id }) } },
  { upsert: true, new: true });

const branches = [
  { code: "ARANETA", name: "Araneta Avenue", address: "Baloy Street, Gregorio Araneta Avenue", municipality: "Quezon City, Metro Manila", phone: "(02) 8242 5500 / (02) 8242 5499", image: "/branches/Araneta.jfif", pinAccuracy: "approximate", coords: [121.0171111, 14.6137514] },
  { code: "TANDANG-SORA", name: "Tandang Sora", address: "221 Tandang Sora Avenue", municipality: "Quezon City, Metro Manila", phone: "0926 662 5327 (Globe) / 0928 774 2515 (Smart)", image: "/branches/Quezon.jfif", pinAccuracy: "mapped", coords: [121.0397264, 14.676957] },
  { code: "PASIG", name: "Pasig City", address: "Mercedes Avenue, Evergreen Memorial Garden", municipality: "Pasig, Metro Manila", phone: "0926 662 5327 (Globe) / 0928 774 2515 (Smart)", image: "/branches/Pasig.jfif", pinAccuracy: "approximate", coords: [121.0928785, 14.5672308] },
  { code: "BAGUIO", name: "Cosmopolitan SF Memorial Chapels", municipality: "Baguio City, Benguet", image: "/branches/Baguio.jfif", pinAccuracy: "approximate", coords: [120.5933878, 16.411986] },
  { code: "JUNQUERA", name: "Junquera Street (main branch)", address: "16-18 Junquera St", municipality: "Cebu City", province: "Cebu, 6000", phone: "(032) 231 0721 / (032) 231 3192 / (032) 256 0491", image: "/branches/junquera.jpg", pinAccuracy: "mapped", coords: [123.8999598, 10.2981514] },
  { code: "MARACAS", name: "Maracas Branch", address: "8VMX+64J, Cebu Veterans Dr", municipality: "Cebu City", province: "Cebu, 6000", phone: "(032) 231 0721 / (032) 231 3192 / (032) 256 0491", image: "/branches/Maracas.png", pinAccuracy: "mapped", coords: [123.8977508, 10.3330044] },
  { code: "MANDAUE", name: "Mandaue City", address: "8WPV+GXM", municipality: "Mandaue", province: "Cebu", image: "/branches/Mandaue.jfif", pinAccuracy: "mapped", coords: [123.9448773, 10.3362544] },
  { code: "LAPULAPU", name: "Lapu-Lapu City", address: "8X74+PRX", municipality: "Lapu-Lapu", province: "Cebu", phone: "(032) 266 3446 / 0917 124 7905", image: "/branches/Lapu-Lapu.png", pinAccuracy: "mapped", coords: [123.9570055, 10.3142556] },
  { code: "CORDOVA", name: "Cordova Branch", address: "Cattleya Memorial Garden, San Miguel", municipality: "Cordova, Cebu", phone: "0915 486 3889 / 0918 905 7820", image: "/branches/cordova.jfif", pinAccuracy: "approximate", coords: [123.9494748, 10.2521909] },
  { code: "LILOAN", name: "Liloan Branch", address: "CX2Q+6XQ, Bajac, Central Nautical Hwy", municipality: "Liloan", province: "6002 Cebu", phone: "(032) 424 9525", image: "/branches/Liloan.jfif", pinAccuracy: "mapped", coords: [123.9898805, 10.4005044] },
  { code: "DANAO", name: "Danao City Branch", address: "832 National", municipality: "Danao", province: "5000 Cebu", phone: "(032) 328 2339 / 0920 949 8173 / 0933 359 3053", image: "/branches/Danao.jfif", pinAccuracy: "approximate", coords: [124.0283744, 10.5180007] },
  { code: "BOGO", name: "Bogo City Branch", address: "22W2+GV5", municipality: "Bogo City", province: "Cebu", phone: "(032) 251 2038 / (032) 434 8312", image: "/branches/Bogo.jfif", pinAccuracy: "mapped", coords: [124.0021305, 11.0462506] },
  { code: "CARCAR", name: "Carcar City Branch", address: "3JWP+WPV", municipality: "Carcar", province: "Cebu", phone: "(032) 487 9574", image: "/branches/Carcar.jfif", pinAccuracy: "mapped", coords: [123.6367523, 10.0972556] },
  { code: "ARGAO", name: "Argao Branch", address: "430 Natalio B. Bacalso S National Hwy", municipality: "Argao", province: "Cebu", phone: "(032) 485 8317", image: "/branches/Argao.jfif", pinAccuracy: "approximate", coords: [123.605901, 9.8802091] },
  { code: "DAVAO", name: "Davao City Branch", address: "J. Camus Extension, Barangay 7-A", municipality: "Davao City, Davao", image: "/branches/Davao.jfif", pinAccuracy: "approximate", coords: [125.6070489, 7.0725806] },
  { code: "CDO", name: "Cagayan de Oro Branch", address: "88 General Capistrano Street", municipality: "Cagayan de Oro City, Misamis Oriental", image: "/branches/Cagayan.jfif", pinAccuracy: "mapped", coords: [124.64434, 8.483992] },
  { code: "ILIGAN", name: "Iligan City Branch", address: "Tibanga Highway", municipality: "Iligan City, Lanao del Norte", image: "/branches/Iligan.jfif", pinAccuracy: "approximate", coords: [124.2412, 8.2317] },
  { code: "GENERAL-SANTOS", name: "General Santos City", municipality: "General Santos, South Cotabato", image: "/branches/General_Santos.jfif", pinAccuracy: "approximate", coords: [125.1721893, 6.1122217] },
  { code: "TAGUM", name: "Tagum City", municipality: "Tagum, Davao del Norte", image: "/branches/Tagum.jfif", pinAccuracy: "approximate", coords: [125.8094853, 7.4470784] },
  { code: "VALENCIA", name: "Valencia City", municipality: "Valencia, Bukidnon", image: "/branches/Valencia.jfif", pinAccuracy: "approximate", coords: [125.0898033, 7.9028844] },
  { code: "ILOILO", name: "Iloilo City", municipality: "Iloilo, Western Visayas", pinAccuracy: "approximate", coords: [122.5736774, 10.6926464] },
  { code: "GUIMARAS", name: "Guimaras service area", municipality: "Guimaras, Western Visayas", pinAccuracy: "approximate", coords: [122.6238907, 10.5730629] },
];
const legacyNames: Record<string, string> = {
  JUNQUERA: "Cosmopolitan Funeral Parlor – Junquera",
  MANDAUE: "Cosmopolitan Funeral Homes – Mandaue Chapels",
  LAPULAPU: "Cosmopolitan Funeral Homes – Pajo",
  CDO: "Cosmopolitan Funeral Chapel – Cagayan de Oro",
};
for (const b of branches) {
  const fields = {
    code: b.code, slug: b.code.toLowerCase(), name: b.name, address: b.address, municipality: b.municipality, province: b.province, phone: b.phone,
    image: b.image, pinAccuracy: b.pinAccuracy, location: { type: "Point", coordinates: b.coords },
    status: "active", verified: true, updatedBy: admin._id,
  };
  const legacyName = legacyNames[b.code];
  if (legacyName && (await Branch.updateOne({ code: b.code, name: legacyName }, { $set: fields })).matchedCount) continue;
  await Branch.updateOne({ code: b.code }, { $setOnInsert: { ...fields, createdBy: admin._id } }, { upsert: true });
}

const seededCount = await Branch.countDocuments({ code: { $in: branches.map((b) => b.code) }, status: "active", verified: true });
if (seededCount !== branches.length) throw new Error(`Expected ${branches.length} active public branches, found ${seededCount}`);
console.log(`Seeded admin and verified ${seededCount} public branch locations.`);
await mongoose.disconnect();
