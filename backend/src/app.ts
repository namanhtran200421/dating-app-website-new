import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

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

function createLimiter(identifier: string, limit: number, windowMs: number) {
  return rateLimit({
    identifier,
    windowMs,
    limit,
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
    options.trustedProxyHops ?? (isDevelopment ? false : 1),
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
