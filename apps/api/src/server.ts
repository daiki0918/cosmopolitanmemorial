import mongoose from "mongoose";
import { env } from "./config/env.js";
import { app } from "./app.js";
import { RateLimitBucket } from "./models/index.js";
await mongoose.connect(env.MONGODB_URI);
await RateLimitBucket.createIndexes();
app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
