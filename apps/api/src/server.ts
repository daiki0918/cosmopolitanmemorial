import mongoose from "mongoose";
import { env } from "./config/env.js";
import { app } from "./app.js";
await mongoose.connect(env.MONGODB_URI);
app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
