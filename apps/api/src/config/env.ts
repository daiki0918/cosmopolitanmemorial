import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url(),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", Object.keys(parsed.error.flatten().fieldErrors).join(", "));
  process.exit(1);
}
export const env = parsed.data;
