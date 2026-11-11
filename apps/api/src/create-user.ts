import mongoose from "mongoose";
import argon2 from "argon2";
import { z } from "zod";
import { User, Branch, audit_ } from "./models/index.js";
import { ROLES, GLOBAL_ROLES } from "./config/permissions.js";

// Usage: npm run create-user -w apps/api -- <email> [role] [BRANCHCODE,BRANCHCODE] --name=Full_Name
// Underscores in --name become spaces. The password is typed at a hidden prompt, so it never
// lands in shell history, .env or logs.
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");

const args = process.argv.slice(2);
const nameOpt = args.find((a) => a.startsWith("--name="));
const [emailArg, roleArg = "administrator", branchesArg = ""] = args.filter((a) => !a.startsWith("--"));
const nameArg = nameOpt?.slice(7).replace(/_/g, " ");
const input = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
}).safeParse({ email: emailArg, name: nameArg, role: roleArg });
if (!input.success) {
  console.error("Usage: npm run create-user -w apps/api -- <email> [role] [BRANCHCODE,BRANCHCODE] --name=Full_Name");
  console.error("Roles:", ROLES.join(", "));
  process.exit(1);
}
const { email, name, role } = input.data;
const codes = branchesArg.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
if (!GLOBAL_ROLES.includes(role) && role !== "content_manager" && !codes.length) {
  console.error(`Role "${role}" needs at least one branch code, e.g. JUNQUERA,MANDAUE`);
  process.exit(1);
}

/** Reads a line from the terminal without echoing it. */
const ask = (q: string) => new Promise<string>((resolve) => {
  process.stdout.write(q);
  const stdin = process.stdin;
  let buf = "";
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  const onData = (chunk: string) => {
    for (const ch of chunk) {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode?.(false); stdin.pause(); stdin.off("data", onData);
        process.stdout.write("\n");
        return resolve(buf);
      }
      if (ch === "\u0003") process.exit(1); // Ctrl+C
      buf = ch === "\u007f" || ch === "\b" ? buf.slice(0, -1) : buf + ch;
    }
  };
  stdin.on("data", onData);
});

const password = await ask("Password (12+ characters): ");
const again = await ask("Confirm password: ");
if (password !== again) { console.error("Passwords do not match."); process.exit(1); }
if (password.length < 12 || password.length > 256) { console.error("Password must be 12 to 256 characters."); process.exit(1); }

await mongoose.connect(MONGODB_URI);
try {
  if (await User.exists({ email })) throw new Error(`A user with ${email} already exists.`);
  const found = codes.length ? await Branch.find({ code: { $in: codes } }).select("_id code") : [];
  const missing = codes.filter((c) => !found.some((b) => b.code === c));
  if (missing.length) throw new Error(`Unknown branch code(s): ${missing.join(", ")}`);

  const u = await User.create({
    email, name, role,
    branches: found.map((b) => b._id),
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
  });
  await audit_(undefined, "user.create.cli", u.id, { email, role });
  console.log(`Created ${role} account for ${email}. Sign in at http://localhost:5173/admin/login`);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}