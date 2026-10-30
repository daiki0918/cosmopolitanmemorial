import { Router } from "express";
import { Schema, model, Model } from "mongoose";
import { z } from "zod";
import { requireAuth, can } from "../middleware/auth.js";
import { audit_ } from "../models/index.js";

const flags = { published: { type: Boolean, default: false }, archived: { type: Boolean, default: false } };
const Service = model("Service", new Schema({ title: { type: String, required: true }, description: String, price: String, image: String, available: { type: Boolean, default: true }, ...flags }, { timestamps: true }));
const Product = model("Product", new Schema({ title: { type: String, required: true }, kind: { type: String, enum: ["product", "package"], default: "product" }, category: String, description: String, price: String, image: String, inclusions: [String], available: { type: Boolean, default: true }, ...flags }, { timestamps: true }));
const Faq = model("Faq", new Schema({ question: { type: String, required: true }, answer: { type: String, required: true }, category: { type: String, default: "general" }, ...flags }, { timestamps: true }));

const common = { description: z.string().max(4000).optional(), price: z.string().max(80).optional(), image: z.string().url().optional().or(z.literal("")), available: z.boolean().optional(), published: z.boolean().optional() };
const bodies = {
  services: z.object({ title: z.string().min(2).max(150), ...common }),
  products: z.object({ title: z.string().min(2).max(150), kind: z.enum(["product", "package"]).optional(), category: z.string().max(80).optional(), inclusions: z.array(z.string().max(200)).max(30).optional(), ...common }),
  faqs: z.object({ question: z.string().min(5).max(300), answer: z.string().min(2).max(4000), category: z.enum(["general", "services", "packages", "payments", "branches"]).optional(), published: z.boolean().optional() }),
};
const models: Record<keyof typeof bodies, Model<any>> = { services: Service, products: Product, faqs: Faq };

export const adminContent = Router();
export const publicContent = Router();
for (const name of Object.keys(bodies) as (keyof typeof bodies)[]) {
  const M = models[name], body = bodies[name];
  adminContent.get(`/${name}`, requireAuth, can("content:write"), async (_q, res) => void res.json(await M.find({ archived: false }).sort("-createdAt").limit(200)));
  adminContent.post(`/${name}`, requireAuth, can("content:write"), async (req, res) => {
    const d = await M.create(body.parse(req.body)); await audit_(req.user!.id, `${name}.create`, d.id); res.status(201).json(d);
  });
  adminContent.patch(`/${name}/:id`, requireAuth, can("content:write"), async (req, res) => {
    const d = await M.findByIdAndUpdate(req.params.id, body.partial().parse(req.body), { new: true });
    if (!d) return void res.status(404).json({ error: "Not found" });
    await audit_(req.user!.id, `${name}.update`, d.id); res.json(d);
  });
  adminContent.delete(`/${name}/:id`, requireAuth, can("content:write"), async (req, res) => { // archive, never hard-delete
    await M.findByIdAndUpdate(req.params.id, { archived: true, published: false }); await audit_(req.user!.id, `${name}.archive`, req.params.id); res.status(204).end();
  });
  publicContent.get(`/${name}`, async (_q, res) => void res.json(await M.find({ published: true, archived: false }).sort("-createdAt").limit(200)));
}
