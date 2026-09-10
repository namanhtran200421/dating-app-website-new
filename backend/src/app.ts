import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

import { analyticsRouter } from "./analytics/analytics.js";
import contactRouter from "./routes/contactRoute.js";
import preSignupRouter from "./routes/preSignupRoute.js";

const PRODUCTION_ORIGINS = [
  "https://www.rosemarry.app",
  "https://rosemarry.app",
] as const;
const DEVELOPMENT_ORIGINS = [
  ...PRODUCTION_ORIGINS,
  "http://localhost:4200",
  "http://127.0.0.1:4200",
] as const;

export interface AppOptions {
  nodeEnv?: string;
  trustedProxyHops?: number | false;
}

// Allow the number of trusted proxy hops to be corrected via configuration
// without a code change, since the real hop count depends on the deployment
// (Render + Cloudflare). Rate-limit keying no longer depends on this value
// (see resolveClientKey), but req.ip and other proxy-aware behaviour still do.
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

// Cloudflare fronts the Render origin (every response carries a `cf-ray`
// header), so the request reaches Express through more than one proxy and a
// hardcoded `trust proxy` hop count cannot be relied on to identify the caller.
// Cloudflare stamps the real client address on the `CF-Connecting-IP` request
// header, and the origin is only reachable through Cloudflare's edge, so that
// header is the trustworthy rate-limit key. Fall back to `req.ip` (governed by
// `trust proxy`) when the header is absent, e.g. local development and tests.
// `ipKeyGenerator` normalises the value (grouping IPv6 addresses by subnet).
function resolveClientKey(req: Request): string {
  const cfConnectingIp = req.get("cf-connecting-ip")?.trim();
  const clientIp =
    cfConnectingIp && cfConnectingIp.length > 0 ? cfConnectingIp : req.ip;
  return ipKeyGenerator(clientIp ?? "unknown");
}

function createLimiter(identifier: string, limit: number, windowMs: number) {
  return rateLimit({
    identifier,
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

  // Render is the only network path to this process and contributes one proxy hop.
  // This makes req.ip, and therefore the rate-limit key, represent the client.
  app.set(
    "trust proxy",
    options.trustedProxyHops ??
      parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS) ??
      (isDevelopment ? false : 1),
  );
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: [...allowedOrigins],
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use(express.json({ limit: "32kb", strict: true }));

  app.use(
    "/api/pre-signups",
    createLimiter("pre-signup", 100, 15 * 60 * 1000),
    preSignupRouter,
  );
  app.use(
    "/api/contact",
    createLimiter("contact", 50, 15 * 60 * 1000),
    contactRouter,
  );
  app.use(
    "/api/analytics",
    createLimiter("analytics", 60, 60 * 1000),
    analyticsRouter,
  );

  app.get("/api/health", function (_req: Request, res: Response): void {
    res.status(200).json({ message: "Backend is running" });
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
