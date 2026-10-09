import "dotenv/config";
import mongoose from "mongoose";

import { PreSignSchema } from "../models/subscripeModel.js";

const mongoUri = process.env.MONGO_URI?.trim();

if (!mongoUri) {
  throw new Error("MONGO_URI is required.");
}

try {
  await mongoose.connect(mongoUri);

  const [caseVariantDuplicate] = await PreSignSchema.collection
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();

  if (caseVariantDuplicate) {
    throw new Error(
      "Case-variant duplicate emails require manual review before migration.",
    );
  }

  // Historical records have no evidence of email ownership. Preserve them,
  // but keep them PENDING until the address completes the new confirmation
  // flow. Do not infer consent from the existence of an old record.
  const result = await PreSignSchema.collection.updateMany(
    {
      $or: [
        { emailKey: { $exists: false } },
        { status: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          emailKey: { $toLower: "$email" },
          processedWebhookIds: { $ifNull: ["$processedWebhookIds", []] },
          status: { $ifNull: ["$status", "PENDING"] },
        },
      },
    ],
  );

  await PreSignSchema.init();

  console.log(
    JSON.stringify({
      historicalSignupsMigrated: result.modifiedCount,
    }),
  );
} finally {
  await mongoose.disconnect();
}
