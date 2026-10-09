import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { rateLimit, ipKeyGenerator, type Store } from "express-rate-limit";

import { createResendWebhookController } from "./controllers/resendWebhookController.js";
import { verifyFormRequest } from "./middleware/verifyFormRequest.js";
import { createContactRouter } from "./routes/contactRoute.js";
import { createPreSignupRouter } from "./routes/preSignupRoute.js";
import {
  disabledAutoReplyEmailService,
  type AutoReplyEmailService,
} from "./services/autoReplyEmail.js";
import {
  acceptAllEmailDomainValidator,
  type EmailDomainValidator,
} from "./services/emailDomainValidation.js";
import type { PreSignupWorkflow } from "./services/preSignupWorkflow.js";
import type { ResendWebhookVerifier } from "./services/resendWebhook.js";

const PRODUCTION_ORIGINS = [
  "https://www.rosemarry.app",
  "https://rosemarry.app",
] as const;
const DEVELOPMENT_ORIGINS = [
  ...PRODUCTION_ORIGINS,
  "http://localhost:4200",
  "http://127.0.0.1:4200",
] as const;
const FORM_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PRE_SIGNUP_RATE_LIMIT = 10;
const PRE_SIGNUP_RESEND_RATE_LIMIT = 3;
const PRE_SIGNUP_TOKEN_RATE_LIMIT = 20;
const CONTACT_RATE_LIMIT = 5;
const RESEND_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface AppOptions {
  autoReplyEmailService?: AutoReplyEmailService;
  // Pass the same validator the pre-signup workflow uses so both forms accept the same addresses.
  emailDomainValidator?: EmailDomainValidator;
  // Reports whether dependencies (MongoDB) can serve requests; drives /api/health.
  isReady?: () => boolean;
  nodeEnv?: string;
  preSignupWorkflow?: PreSignupWorkflow;
  // Shared counters for running several instances. Defaults to per-process memory.
  rateLimitStore?: (identifier: string) => Store;
  resendWebhookVerifier?: ResendWebhookVerifier;
  trustedProxyHops?: number | false;
}

const unavailablePreSignupWorkflow: PreSignupWorkflow = {
  async submit(): Promise<never> {
    throw new Error("Pre-signup workflow is not configured.");
  },
  async requestResend(): Promise<void> {
    throw new Error("Pre-signup workflow is not configured.");
  },
  async confirmVerification() {
    return { receiptSent: false, verified: false };
  },
  async unsubscribe(): Promise<boolean> {
    return false;
  },
  async handleWebhook(): Promise<void> {
    throw new Error("Pre-signup workflow is not configured.");
  },
};

const unavailableWebhookVerifier: ResendWebhookVerifier = {
  verify() {
    throw new Error("Webhook verification is not configured.");
  },
};

// Allow the number of trusted proxy hops to be corrected via configuration
// without a code change, since the real hop count depends on the deployment
// (Render + Cloudflare). Rate-limit keying depends on req.ip, so this setting
// must only be changed after verifying the deployment's proxy topology.
function parseTrustedProxyHops(raw: string | undefined): number | undefined {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error("TRUSTED_PROXY_HOPS must be an integer from 0 to 10.");
  }
  return hops;
}

// The public frontend calls the Render hostname directly, so client-supplied
// forwarding headers (including CF-Connecting-IP) are not trustworthy here.
// Express derives req.ip from Render's proxy chain according to `trust proxy`.
// ipKeyGenerator normalises IPv4/IPv6 and groups IPv6 addresses by subnet.
function resolveClientKey(req: Request): string {
  return ipKeyGenerator(req.ip ?? "unknown");
}

function createLimiter(
  identifier: string,
  limit: number,
  windowMs: number,
  storeFor?: (identifier: string) => Store,
) {
  return rateLimit({
    identifier,
    ...(storeFor ? { store: storeFor(identifier) } : {}),
    windowMs,
    limit,
    keyGenerator: resolveClientKey,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  });
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "production";
  const isDevelopment = nodeEnv === "development" || nodeEnv === "test";
  const allowedOrigins = isDevelopment
    ? DEVELOPMENT_ORIGINS
    : PRODUCTION_ORIGINS;
  const allowedOriginSet = new Set<string>(allowedOrigins);
  const autoReplyEmailService =
    options.autoReplyEmailService ?? disabledAutoReplyEmailService;
  const emailDomainValidator =
    options.emailDomainValidator ?? acceptAllEmailDomainValidator;
  const preSignupWorkflow =
    options.preSignupWorkflow ?? unavailablePreSignupWorkflow;
  const resendWebhookVerifier =
    options.resendWebhookVerifier ?? unavailableWebhookVerifier;

  // Render is the only network path to this process and contributes one proxy hop.
  // This makes req.ip, and therefore the rate-limit key, represent the client.
  app.set(
    "trust proxy",
    options.trustedProxyHops ??
      parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS) ??
      (isDevelopment ? false : 1),
  );
  app.disable("x-powered-by");
  app.disable("etag");
  app.set("query parser", false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          connectSrc: ["'none'"],
          fontSrc: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
        },
      },
      frameguard: { action: "deny" },
      hsts: {
        maxAge: 63_072_000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use(
    cors({
      origin: [...allowedOrigins],
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use("/api", function preventApiCaching(_req, res, next): void {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.post(
    "/api/pre-signups/resend",
    verifyFormRequest(allowedOriginSet),
    createLimiter(
      "pre-signup-resend",
      PRE_SIGNUP_RESEND_RATE_LIMIT,
      RESEND_RATE_LIMIT_WINDOW_MS,
      options.rateLimitStore,
    ),
  );
  app.post(
    ["/api/pre-signups/verify", "/api/pre-signups/unsubscribe"],
    verifyFormRequest(allowedOriginSet),
    createLimiter(
      "pre-signup-token",
      PRE_SIGNUP_TOKEN_RATE_LIMIT,
      FORM_RATE_LIMIT_WINDOW_MS,
      options.rateLimitStore,
    ),
  );
  app.post(
    "/api/pre-signups",
    verifyFormRequest(allowedOriginSet),
    createLimiter(
      "pre-signup",
      PRE_SIGNUP_RATE_LIMIT,
      FORM_RATE_LIMIT_WINDOW_MS,
      options.rateLimitStore,
    ),
  );
  app.post(
    "/api/contact",
    verifyFormRequest(allowedOriginSet),
    createLimiter(
      "contact",
      CONTACT_RATE_LIMIT,
      FORM_RATE_LIMIT_WINDOW_MS,
      options.rateLimitStore,
    ),
  );
  app.post(
    "/api/webhooks/resend",
    express.raw({ limit: "64kb", type: "application/json" }),
    createResendWebhookController(resendWebhookVerifier, preSignupWorkflow),
  );
  app.use(express.json({ limit: "32kb", strict: true }));

  app.use("/api/pre-signups", createPreSignupRouter(preSignupWorkflow));
  app.use(
    "/api/contact",
    createContactRouter(autoReplyEmailService, emailDomainValidator),
  );

  const isReady = options.isReady ?? (() => true);
  app.get("/api/health", function (_req: Request, res: Response): void {
    // 503 lets the platform stop routing to an instance that lost its database.
    if (!isReady()) {
      res.status(503).json({ status: "unavailable" });
      return;
    }
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", function (_req: Request, res: Response): void {
    res.status(404).json({ success: false, message: "Not found." });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const requestError = error as { status?: number; type?: string };

    if (requestError.type === "entity.too.large") {
      res.status(413).json({ success: false, message: "Payload too large." });
      return;
    }

    if (error instanceof SyntaxError && requestError.status === 400) {
      res.status(400).json({ success: false, message: "Invalid JSON." });
      return;
    }

    console.error("Unhandled API request error.");
    res
      .status(500)
      .json({ success: false, message: "Unable to process request." });
  };
  app.use(errorHandler);

  return app;
}
