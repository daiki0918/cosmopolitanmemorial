import { NextFunction, Request, Response, Router, raw } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { can, requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const validImage = (image: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (mimeType === "image/png") return image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return image.length >= 12 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP";
};
const bucketName = "branch_images";
const getBucket = () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB is not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName });
};

const admin = Router();
admin.use(requireAuth);
admin.post("/branch-geocode", can("branches:write"), async (req, res) => {
  const { query } = z.object({ query: z.string().trim().min(3).max(300) }).parse(req.body);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: query, format: "jsonv2", addressdetails: "1", limit: "1" }).toString();

  const geocode = geocodeQueue.then(async () => {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastGeocodeAt = Date.now();
    return fetch(url, {
      headers: {
        "User-Agent": `CosmopolitanFuneralHomesAdmin/1.0 (${env.PUBLIC_WEB_URL || env.WEB_ORIGIN})`,
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
    });
  });
  geocodeQueue = geocode.then(() => undefined, () => undefined);

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await geocode;
  } catch (error) {
    console.error("OpenStreetMap address lookup failed.", error);
    return void res.status(502).json({ error: "Address lookup is temporarily unavailable. Try again or enter coordinates manually." });
  }
  if (!response.ok) {
    console.error(`OpenStreetMap address lookup returned HTTP ${response.status}.`);
    return void res.status(502).json({ error: "Address lookup is temporarily unavailable. Try again or enter coordinates manually." });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    console.error("OpenStreetMap address lookup returned invalid JSON.", error);
    return void res.status(502).json({ error: "Address lookup returned invalid data." });
  }
  const results = z.array(z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    addresstype: z.string().optional(),
  })).safeParse(payload);
  if (!results.success) return void res.status(502).json({ error: "Address lookup returned invalid data." });
  const result = results.data[0];
  if (!result) return void res.json({ result: null });
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return void res.status(502).json({ error: "Address lookup returned invalid coordinates." });
  }
  res.json({
    result: {
      lat,
      lng,
      displayName: result.display_name,
      pinAccuracy: ["house", "building", "entrance"].includes(result.addresstype ?? "") ? "mapped" : "approximate",
    },
  });
});

admin.post(
  "/branch-images",
  can("branches:write"),
  raw({ type: [...imageTypes.keys()], limit: "5mb" }),
  async (req, res) => {
    const mimeType = req.headers["content-type"]?.split(";")[0].trim();
    const extension = mimeType ? imageTypes.get(mimeType) : undefined;
    if (!mimeType || !extension || !Buffer.isBuffer(req.body) || !validImage(req.body, mimeType)) {
      return void res.status(400).json({ error: "Choose a non-empty JPEG, PNG, or WebP image." });
    }

    const bucket = getBucket();
    const upload = bucket.openUploadStream(`${new mongoose.mongo.ObjectId().toHexString()}.${extension}`, {
      metadata: { contentType: mimeType, uploadedBy: req.user!.id },
    });
    await new Promise<void>((resolve, reject) => {
      upload.once("finish", resolve);
      upload.once("error", reject);
      upload.end(req.body);
    });

    res.status(201).json({ id: upload.id.toString() });
  },
);
admin.delete("/branch-images/:id", can("branches:write"), async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return void res.status(404).end();
  const bucket = getBucket();
  const [file] = await bucket.find({ _id: new mongoose.mongo.ObjectId(req.params.id) }).limit(1).toArray();
  if (!file || file.metadata?.uploadedBy !== req.user!.id) return void res.status(404).end();
  await bucket.delete(file._id);
  res.status(204).end();
});

const publicMedia = Router();
publicMedia.get("/branch-images/:id", async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return void res.status(404).end();
  const id = new mongoose.mongo.ObjectId(req.params.id);
  const bucket = getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return void res.status(404).end();
  const contentType = file.metadata?.contentType;
  if (typeof contentType !== "string" || !imageTypes.has(contentType)) return void res.status(404).end();
  res.set({ "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" });
  const download = bucket.openDownloadStream(id);
  download.on("error", next);
  download.pipe(res);
});

admin.use((error: { type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (error?.type === "entity.too.large") return void res.status(413).json({ error: "Choose an image smaller than 5 MB." });
  next(error);
});

let lastGeocodeAt = 0;
let geocodeQueue: Promise<void> = Promise.resolve();

export { admin as branchMediaAdmin, publicMedia as branchMediaPublic };
