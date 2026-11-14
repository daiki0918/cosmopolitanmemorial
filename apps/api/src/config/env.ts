import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  WEB_ORIGIN: z.string().url(),
  PUBLIC_WEB_URL: z.string().url().optional().or(z.literal("")),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  TURNSTILE_SECRET_KEY: z.string().default(""),
  GMAIL_USER: z.string().email().optional().or(z.literal("")),
  GMAIL_APP_PASSWORD: z.string().default(""),
  TEXTBEE_API_KEY: z.string().default(""),
  TEXTBEE_DEVICE_ID: z.string().max(200).default(""),
}).superRefine((config, ctx) => {
  if (!!config.GMAIL_USER !== !!config.GMAIL_APP_PASSWORD) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GMAIL_USER"], message: "GMAIL_USER and GMAIL_APP_PASSWORD must be configured together" });
  }
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", Object.keys(parsed.error.flatten().fieldErrors).join(", "));
  process.exit(1);
}
if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  console.error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  process.exit(1);
}
export const env = parsed.data;
