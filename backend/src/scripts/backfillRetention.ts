import "dotenv/config";
import mongoose from "mongoose";

import {
  retentionDays,
  validateRetentionConfiguration,
} from "../config/retention.js";
import { ContactMessageSchema } from "../models/contactModel.js";
import { PreSignSchema } from "../models/subscripeModel.js";

const mongoUri = process.env.MONGO_URI?.trim();

if (!mongoUri) {
  throw new Error("MONGO_URI is required.");
}

validateRetentionConfiguration();

try {
  await mongoose.connect(mongoUri);
  await Promise.all([ContactMessageSchema.init(), PreSignSchema.init()]);

  const contactDays = retentionDays("CONTACT_RETENTION_DAYS");
  const preSignupDays = retentionDays("PRE_SIGNUP_RETENTION_DAYS");
  const [contacts, preSignups] = await Promise.all([
    ContactMessageSchema.collection.updateMany(
      { expiresAt: { $exists: false } },
      [
        {
          $set: {
            expiresAt: {
              $dateAdd: {
                startDate: "$createdAt",
                unit: "day",
                amount: contactDays,
              },
            },
          },
        },
      ],
    ),
    PreSignSchema.collection.updateMany({ expiresAt: { $exists: false } }, [
      {
        $set: {
          expiresAt: {
            $dateAdd: {
              startDate: "$createdAt",
              unit: "day",
              amount: preSignupDays,
            },
          },
        },
      },
    ]),
  ]);

  console.log(
    JSON.stringify({
      contactsUpdated: contacts.modifiedCount,
      preSignupsUpdated: preSignups.modifiedCount,
    }),
  );
} finally {
  await mongoose.disconnect();
}
