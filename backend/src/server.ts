import "dotenv/config";
import mongoose from "mongoose";

import { createApp } from "./app.js";
import { validateRetentionConfiguration } from "./config/retention.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import { PreSignSchema } from "./models/subscripeModel.js";

mongoose.set("sanitizeFilter", true);

// Fail secure when a hosting platform does not set NODE_ENV explicitly.
const nodeEnv = process.env.NODE_ENV ?? "production";
const port = Number(process.env.PORT ?? 3000);
const mongo = process.env.MONGO_URI?.trim();

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port.");
}

if (!mongo) {
  throw new Error("MONGO_URI is required.");
}
const mongoUri = mongo;

validateRetentionConfiguration();

async function startServer(): Promise<void> {
  await mongoose.connect(mongoUri);
  await Promise.all([ContactMessageSchema.init(), PreSignSchema.init()]);

  const app = createApp({ nodeEnv });

  console.log("Connected to required services");

  app.listen(port, function (error?: Error): void {
    if (error) {
      console.error("HTTP server failed to start.");
      return;
    }

    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch(function (): void {
  console.error("Failed to start required services.");
  process.exit(1);
});
