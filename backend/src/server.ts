import "dotenv/config";
import mongoose from "mongoose";

import { createApp } from "./app.js";
import {
  retentionDays,
  validateRetentionConfiguration,
} from "./config/retention.js";
import { loadSubscriptionConfiguration } from "./config/subscription.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import { PreSignSchema } from "./models/subscripeModel.js";
import { mongoosePreSignupRepository } from "./repositories/preSignupRepository.js";
import { createAutoReplyEmailService } from "./services/autoReplyEmail.js";
import { createEmailDomainValidator } from "./services/emailDomainValidation.js";
import { createPreSignupWorkflow } from "./services/preSignupWorkflow.js";
import { createResendWebhookVerifier } from "./services/resendWebhook.js";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", "throw");

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
const subscriptionConfiguration = loadSubscriptionConfiguration(nodeEnv);
const autoReplyEmailService = createAutoReplyEmailService(nodeEnv);
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is required.");
}

if (!resendWebhookSecret) {
  throw new Error("RESEND_WEBHOOK_SECRET is required.");
}

const preSignupWorkflow = createPreSignupWorkflow({
  configuration: subscriptionConfiguration,
  emailDomainValidator: createEmailDomainValidator({
    blockDisposableEmails: subscriptionConfiguration.blockDisposableEmails,
    timeoutMs: subscriptionConfiguration.dnsTimeoutMs,
  }),
  emailService: autoReplyEmailService,
  repository: mongoosePreSignupRepository,
  retentionDays: retentionDays("PRE_SIGNUP_RETENTION_DAYS"),
});
const resendWebhookVerifier = createResendWebhookVerifier(
  resendApiKey,
  resendWebhookSecret,
);

async function startServer(): Promise<void> {
  await mongoose.connect(mongoUri);
  await Promise.all([ContactMessageSchema.init(), PreSignSchema.init()]);

  const app = createApp({
    autoReplyEmailService,
    nodeEnv,
    preSignupWorkflow,
    resendWebhookVerifier,
  });

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
