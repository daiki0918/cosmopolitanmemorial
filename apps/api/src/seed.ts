// Dev seed: one super admin from env vars, plus the company's verified flagship branch.
// Branch facts are sourced from a public 2012 news profile (Philstar/Freeman); confirm current
// address, phone and hours with the company before marking any branch verified in production.
import mongoose from "mongoose";
import argon2 from "argon2";
import { User, Branch } from "./models/index.js";
const { MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) throw new Error("Set MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD");
await mongoose.connect(MONGODB_URI);
const admin = await User.findOneAndUpdate({ email: SEED_ADMIN_EMAIL.toLowerCase() },
  { $setOnInsert: { name: "Super Admin", role: "super_admin", passwordHash: await argon2.hash(SEED_ADMIN_PASSWORD, { type: argon2.argon2id }) } },
  { upsert: true, new: true });

// Addresses and phone numbers below are from public directories/news coverage, not an official
// company feed. Coordinates are approximate map centers for the area, not pinned addresses.
// Every branch is seeded unverified; confirm each one and set its exact pin in /admin before
// marking it verified, which is what makes it visible on the public site.
const branches = [
  { code: "JUNQUERA", name: "Cosmopolitan Funeral Parlor – Junquera", address: "16 General Junquera Street", municipality: "Cebu City", province: "Cebu", phone: "(032) 256 0491 to 94", image: "/branches/junquera.jpg", coords: [123.8938, 10.3083] },
  { code: "NIVELHILLS", name: "Cosmopolitan Memorial Chapels – Nivel Hills (Crystal Palace)", address: "Nivel Hills", municipality: "Cebu City", province: "Cebu", phone: "(032) 231 0721 / 231 3192 / 231 2894", coords: [123.9025, 10.3315] },
  { code: "MANDAUE", name: "Cosmopolitan Funeral Homes – Mandaue Chapels", address: "Estancia", municipality: "Mandaue City", province: "Cebu", phone: "(032) 344 5240 / (032) 420 5662", coords: [123.9423, 10.3236] },
  { code: "LAPULAPU", name: "Cosmopolitan Funeral Homes – Pajo", address: "Pajo", municipality: "Lapu-Lapu City", province: "Cebu", phone: "(032) 340 8374", coords: [123.9494, 10.3103] },
  { code: "CDO", name: "Cosmopolitan Funeral Chapel – Cagayan de Oro", address: "Cagayan de Oro", municipality: "Cagayan de Oro City", province: "Misamis Oriental", phone: "(088) 856 2420", coords: [124.6472, 8.4822] },
];
for (const b of branches) {
  await Branch.updateOne({ code: b.code }, { $setOnInsert: {
    code: b.code, slug: b.code.toLowerCase(), name: b.name, address: b.address, municipality: b.municipality, province: b.province, phone: b.phone,
    image: b.image, location: { type: "Point", coordinates: b.coords },
    status: "active", verified: false, createdBy: admin._id, updatedBy: admin._id,
  } }, { upsert: true });
}

console.log(`Seeded admin and ${branches.length} unverified branches — confirm each one, pin its exact location, then verify in /admin.`);
await mongoose.disconnect();
