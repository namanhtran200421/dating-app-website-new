import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Options } from "express-rate-limit";
import mongoose from "mongoose";
import request from "supertest";

import { createApp } from "./app.js";
import {
  ensureRateLimitIndexes,
  MongoRateLimitStore,
  type RateLimitCollection,
  type RateLimitDocument,
} from "./services/mongoRateLimitStore.js";

// Needs a disposable MongoDB (CI starts one). Never point this at a real database.
const MONGO_TEST_URI = process.env.MONGO_TEST_URI;
const skip = MONGO_TEST_URI ? false : "MONGO_TEST_URI is not set";
let collection: RateLimitCollection;

function storeWithWindow(prefix: string, windowMs: number): MongoRateLimitStore {
  const store = new MongoRateLimitStore(collection, prefix);
  store.init({ windowMs } as Options);
  return store;
}

before(async () => {
  if (!MONGO_TEST_URI) return;
  await mongoose.connect(MONGO_TEST_URI, { dbName: `rate_limit_test_${process.pid}` });
  collection = mongoose.connection.db!.collection<RateLimitDocument>("rateLimits");
  await ensureRateLimitIndexes(collection);
});

after(async () => {
  if (!MONGO_TEST_URI) return;
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

test("counts hits inside a window and starts over after it", { skip }, async () => {
  const store = storeWithWindow("window", 150);

  assert.equal((await store.increment("client")).totalHits, 1);
  assert.equal((await store.increment("client")).totalHits, 2);
  await store.decrement("client");
  assert.equal((await store.get("client"))?.totalHits, 1);

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(await store.get("client"), undefined);
  assert.equal((await store.increment("client")).totalHits, 1);

  await store.resetKey("client");
  assert.equal(await store.get("client"), undefined);
});

test("concurrent increments are atomic", { skip }, async () => {
  const store = storeWithWindow("atomic", 60_000);
  const results = await Promise.all(
    Array.from({ length: 25 }, () => store.increment("client")),
  );

  assert.deepEqual(
    results.map((result) => result.totalHits).sort((a, b) => a - b),
    Array.from({ length: 25 }, (_, index) => index + 1),
  );
});

test("separate API instances share one limit", { skip }, async () => {
  const options = {
    nodeEnv: "production",
    rateLimitStore: (identifier: string) =>
      new MongoRateLimitStore(collection, `shared-${identifier}`),
  };
  const instances = [createApp(options), createApp(options)];
  const statuses: number[] = [];

  // The contact limit is 5 per window; alternate between two "servers".
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await request(instances[attempt % 2]!)
      .post("/api/contact")
      .set("Origin", "https://www.rosemarry.app")
      .send({});
    statuses.push(response.status);
  }

  assert.equal(statuses.at(-1), 429);
  assert.ok(statuses.slice(0, 5).every((status) => status !== 429));
});
