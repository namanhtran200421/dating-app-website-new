import type { IncrementResponse, Options, Store } from "express-rate-limit";
import type { mongo } from "mongoose";

export const RATE_LIMIT_COLLECTION = "rateLimits";

export interface RateLimitDocument {
  _id: string;
  hits: number;
  resetAt: Date;
}

export type RateLimitCollection = mongo.Collection<RateLimitDocument>;

// Expired windows are removed by MongoDB's TTL monitor. Counting never relies on
// that cleanup: increment() treats a window as expired once resetAt has passed.
export async function ensureRateLimitIndexes(
  collection: RateLimitCollection,
): Promise<void> {
  await collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
}

/**
 * express-rate-limit store shared by every API instance through MongoDB, so
 * limits hold when the service runs more than one process.
 */
export class MongoRateLimitStore implements Store {
  readonly localKeys = false;
  private windowMs = 60_000;

  constructor(
    private readonly collection: RateLimitCollection,
    readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async get(key: string): Promise<IncrementResponse | undefined> {
    const document = await this.collection.findOne({ _id: this.id(key) });

    return document && document.resetAt > new Date()
      ? { totalHits: document.hits, resetTime: document.resetAt }
      : undefined;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const now = new Date();
    const windowIsActive = { $gt: ["$resetAt", now] };

    // One atomic upsert: continue the current window, or start a new one when
    // the previous window has expired (or never existed).
    const document = await this.collection.findOneAndUpdate(
      { _id: this.id(key) },
      [
        {
          $set: {
            hits: { $cond: [windowIsActive, { $add: ["$hits", 1] }, 1] },
            resetAt: {
              $cond: [
                windowIsActive,
                "$resetAt",
                new Date(now.getTime() + this.windowMs),
              ],
            },
          },
        },
      ],
      { returnDocument: "after", upsert: true },
    );

    if (!document) {
      throw new Error("Rate limit counter was not returned.");
    }

    return { totalHits: document.hits, resetTime: document.resetAt };
  }

  async decrement(key: string): Promise<void> {
    await this.collection.updateOne(
      { _id: this.id(key), hits: { $gt: 0 }, resetAt: { $gt: new Date() } },
      { $inc: { hits: -1 } },
    );
  }

  async resetKey(key: string): Promise<void> {
    await this.collection.deleteOne({ _id: this.id(key) });
  }

  private id(key: string): string {
    return `${this.prefix}:${key}`;
  }
}
