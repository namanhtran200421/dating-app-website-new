import "dotenv/config";
import type { Server } from "node:http";
import mongoose from "mongoose";

import { createApp } from "./app.js";
import {
  retentionDays,
  validateRetentionConfiguration,
} from "./config/retention.js";
import { loadSubscriptionConfiguration } from "./config/subscription.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import { PreSignSchema } from "./models/preSignupModel.js";
import { mongoosePreSignupRepository } from "./repositories/preSignupRepository.js";
import { createAutoReplyEmailService } from "./services/autoReplyEmail.js";
import { createEmailDomainValidator } from "./services/emailDomainValidation.js";
import {
  ensureRateLimitIndexes,
  MongoRateLimitStore,
  RATE_LIMIT_COLLECTION,
  type RateLimitDocument,
} from "./services/mongoRateLimitStore.js";
import { createPreSignupWorkflow } from "./services/preSignupWorkflow.js";
import { createResendWebhookVerifier } from "./services/resendWebhook.js";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", "throw");

// Fail secure when a hosting platform does not set NODE_ENV explicitly.
const nodeEnv = process.env.NODE_ENV ?? "production";
const SHUTDOWN_TIMEOUT_MS = 10_000;
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

// Without these every form fails with 503 at request time; refuse to boot instead.
if (nodeEnv === "production") {
  if (!process.env.TURNSTILE_SECRET?.trim()) {
    throw new Error("TURNSTILE_SECRET is required in production.");
  }
  if (
    !(process.env.TURNSTILE_HOSTNAMES ?? process.env.TURNSTILE_EXPECTED_HOSTNAME)?.trim()
  ) {
    throw new Error("TURNSTILE_HOSTNAMES is required in production.");
  }
}

// Shared by pre-signup and contact so both forms accept the same addresses.
const emailDomainValidator = createEmailDomainValidator({
  blockDisposableEmails: subscriptionConfiguration.blockDisposableEmails,
  timeoutMs: subscriptionConfiguration.dnsTimeoutMs,
});
const preSignupWorkflow = createPreSignupWorkflow({
  configuration: subscriptionConfiguration,
  emailDomainValidator,
  emailService: autoReplyEmailService,
  repository: mongoosePreSignupRepository,
  retentionDays: retentionDays("PRE_SIGNUP_RETENTION_DAYS"),
});
const resendWebhookVerifier = createResendWebhookVerifier(
  resendApiKey,
  resendWebhookSecret,
);

// Name and message only: driver errors can be verbose, and stacks add noise to platform logs.
function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
}

async function startServer(): Promise<Server> {
  await mongoose.connect(mongoUri);

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection has no database handle.");
  }
  const rateLimits = database.collection<RateLimitDocument>(RATE_LIMIT_COLLECTION);

  await Promise.all([
    ContactMessageSchema.init(),
    PreSignSchema.init(),
    ensureRateLimitIndexes(rateLimits),
  ]);

  const app = createApp({
    autoReplyEmailService,
    emailDomainValidator,
    // readyState 1 = connected; the driver reconnects on its own after a drop.
    isReady: () => mongoose.connection.readyState === 1,
    nodeEnv,
    preSignupWorkflow,
    rateLimitStore: (identifier) => new MongoRateLimitStore(rateLimits, identifier),
    resendWebhookVerifier,
  });

  console.log("Connected to required services");

  return new Promise((resolve, reject) => {
    const server = app.listen(port, function (error?: Error): void {
      if (error) {
        reject(error);
        return;
      }

      console.log(`Server is running on port ${port}`);
      resolve(server);
    });
  });
}

// Platforms send SIGTERM before replacing an instance: finish in-flight requests,
// close the database pool, and exit before the platform kills the process.
function handleShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down.`);

    setTimeout(() => {
      console.error("Shutdown timed out; exiting.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(() => {
      mongoose
        .disconnect()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error(`Database disconnect failed. ${describeError(error)}`);
          process.exit(1);
        });
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (reason) => {
  console.error(`Unhandled promise rejection. ${describeError(reason)}`);
  process.exit(1);
});

startServer()
  .then(handleShutdown)
  .catch(function (error: unknown): void {
    console.error(`Failed to start required services. ${describeError(error)}`);
    process.exit(1);
  });
