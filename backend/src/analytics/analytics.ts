import { Router } from "express";
import { Schema, model } from "mongoose";
import * as z from "zod";

const paths = [
  "/",
  "/circle",
  "/blog",
  "/about-us",
  "/press",
  "/contact-us",
  "/privacy-and-terms",
  "/blog/dating-without-swiping",
  "/blog/endless-swiping",
  "/blog/dating-app-fatigue",
  "/blog/attraction-over-time",
] as const;
export const analyticsInput = z.strictObject({
  event: z.enum(["visit", "page_view", "signup_start", "signup_success"]),
  path: z.enum(paths),
  landing: z.enum(paths),
  source: z.enum([
    "direct",
    "google",
    "bing",
    "other_search",
    "ai",
    "social",
    "email",
    "referral",
    "paid",
  ]),
  placement: z.enum(["footer", "hero", "pricing", "article"]),
});

const dailyMetricSchema = new Schema(
  {
    _id: String,
    day: { type: String, required: true, index: true },
    event: { type: String, required: true },
    path: { type: String, required: true },
    landing: { type: String, required: true },
    source: { type: String, required: true },
    placement: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false },
);
export const DailyMetric = model("DailyMetric", dailyMetricSchema);
export const analyticsRouter = Router();

analyticsRouter.post("/", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  // The Origin check below stops naive cross-site requests from real browsers,
  // but Origin is a request header that non-browser clients (curl, scripts) can
  // set to anything. It is not a security boundary. The real safeguards against
  // aggregate pollution are the per-IP rate limit and the strict enum schema
  // below, which cap how much and what kind of data any caller can write.
  const isLocalEnvironment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (
    ![
      "https://www.rosemarry.app",
      "https://rosemarry.app",
      ...(isLocalEnvironment
        ? ["http://localhost:4200", "http://127.0.0.1:4173"]
        : []),
    ].includes(req.get("origin") || "")
  ) {
    res.status(403).end();
    return;
  }
  const result = analyticsInput.safeParse(req.body);
  if (!result.success) {
    res.status(400).end();
    return;
  }
  const day = new Date().toISOString().slice(0, 10);
  const metric = result.data;
  // Aggregate immediately. No visitor IDs, IPs, emails, raw URLs or individual event records.
  const id = [
    day,
    metric.event,
    metric.path,
    metric.landing,
    metric.source,
    metric.placement,
  ].join(":");
  try {
    try {
      await DailyMetric.updateOne(
        { _id: id },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            ...metric,
            day,
            expiresAt: new Date(Date.parse(day) + 400 * 86400000),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      // Concurrent first events can race to insert the same daily bucket.
      if ((error as { code?: number }).code !== 11000) throw error;
      await DailyMetric.updateOne({ _id: id }, { $inc: { count: 1 } });
    }
    res.status(204).end();
  } catch {
    res.status(503).end();
  }
});
