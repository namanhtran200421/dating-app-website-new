import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import request from "supertest";

import { createApp } from "./app.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import { PreSignSchema } from "./models/subscripeModel.js";

function setEnvironment(
  t: TestContext,
  key: string,
  value: string | undefined,
): void {
  const previous = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  t.after(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });
}

function remaining(response: request.Response): number {
  const header = response.headers["ratelimit"];
  const match = typeof header === "string" ? /\br=(\d+)\b/.exec(header) : null;
  assert.ok(match, "Expected a RateLimit remaining-value header");
  return Number(match[1]);
}

function mockSuccessfulTurnstile(
  t: TestContext,
  action: "contact" | "pre_signup",
): void {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          hostname: "www.rosemarry.app",
          action,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );
}

test("production CORS excludes local development origins", async () => {
  const app = createApp({ nodeEnv: "production" });

  const local = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:4200");
  const production = await request(app)
    .get("/api/health")
    .set("Origin", "https://www.rosemarry.app");

  assert.equal(local.headers["access-control-allow-origin"], undefined);
  assert.equal(
    production.headers["access-control-allow-origin"],
    "https://www.rosemarry.app",
  );
});

test("unknown environments use production CORS defaults", async () => {
  const app = createApp({ nodeEnv: "staging" });

  const response = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:4200");

  assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("rate limiting keys requests by forwarded client IP", async () => {
  const app = createApp({ nodeEnv: "production", trustedProxyHops: 1 });
  const submit = (clientIp: string) =>
    request(app)
      .post("/api/pre-signups")
      .set("X-Forwarded-For", clientIp)
      .send({});

  const first = await submit("203.0.113.10");
  const second = await submit("203.0.113.10");
  const anotherClient = await submit("203.0.113.11");

  assert.equal(first.status, 403);
  assert.equal(remaining(second), remaining(first) - 1);
  assert.equal(remaining(anotherClient), remaining(first));
});

test("rate limiting keys requests by Cloudflare's CF-Connecting-IP", async () => {
  // Behind Cloudflare, the real client is on CF-Connecting-IP. It must take
  // precedence over the forwarded chain so that limits track the true caller
  // and cannot be evaded by rotating a spoofed X-Forwarded-For value.
  const app = createApp({ nodeEnv: "production", trustedProxyHops: 1 });
  const submit = (cfIp: string, forwardedFor: string) =>
    request(app)
      .post("/api/pre-signups")
      .set("CF-Connecting-IP", cfIp)
      .set("X-Forwarded-For", forwardedFor)
      .send({});

  // Same CF-Connecting-IP but different X-Forwarded-For => one shared bucket.
  const first = await submit("198.51.100.5", "203.0.113.1");
  const second = await submit("198.51.100.5", "203.0.113.99");
  // Different CF-Connecting-IP but identical X-Forwarded-For => separate bucket.
  const otherClient = await submit("198.51.100.6", "203.0.113.1");

  assert.equal(remaining(second), remaining(first) - 1);
  assert.equal(remaining(otherClient), remaining(first));
});

test("malformed and oversized JSON receive generic JSON errors", async () => {
  const app = createApp({ nodeEnv: "production" });

  const malformed = await request(app)
    .post("/api/contact")
    .set("Content-Type", "application/json")
    .send('{"broken":');
  const oversized = await request(app)
    .post("/api/contact")
    .send({ padding: "a".repeat(34_000) });

  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body, {
    success: false,
    message: "Invalid JSON.",
  });
  assert.equal(oversized.status, 413);
  assert.deepEqual(oversized.body, {
    success: false,
    message: "Payload too large.",
  });
});

test("pre-signup responses do not reveal whether an email exists", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "PRE_SIGNUP_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "pre_signup");
  const updateOne = t.mock.method(PreSignSchema, "updateOne", async () => ({
    acknowledged: true,
  }));
  const app = createApp({ nodeEnv: "test" });

  const submit = (email: string) =>
    request(app)
      .post("/api/pre-signups")
      .send({ email, turnstileToken: "valid-token" });
  const first = await submit("new@example.com");
  const second = await submit("existing@example.com");

  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.deepEqual(first.body, second.body);
  assert.equal(updateOne.mock.callCount(), 2);
  assert.deepEqual(updateOne.mock.calls[0]?.arguments[2], {
    upsert: true,
    runValidators: true,
  });
  const update = updateOne.mock.calls[0]?.arguments[1] as {
    $setOnInsert: { expiresAt?: unknown };
  };
  assert.ok(update.$setOnInsert.expiresAt instanceof Date);
});

test("Turnstile test credentials require an explicit local environment", async (t) => {
  setEnvironment(t, "NODE_ENV", undefined);
  setEnvironment(t, "TURNSTILE_SECRET", "1x0000000000000000000000000000000AA");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "PRE_SIGNUP_RETENTION_DAYS", "365");
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const updateOne = t.mock.method(PreSignSchema, "updateOne", async () => ({
    acknowledged: true,
  }));
  const app = createApp();

  const response = await request(app).post("/api/pre-signups").send({
    email: "person@example.com",
    turnstileToken: "valid-token",
  });

  assert.equal(response.status, 403);
  assert.equal(updateOne.mock.callCount(), 0);
});

test("contact success does not echo personal data or database fields", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  t.mock.method(ContactMessageSchema, "create", async () => ({
    _id: "internal-id",
    email: "person@example.com",
  }));
  const app = createApp({ nodeEnv: "test" });

  const response = await request(app).post("/api/contact").send({
    firstName: "Rose",
    lastName: "Marry",
    email: "person@example.com",
    subject: "Feedback",
    message: "Hello",
    turnstileToken: "valid-token",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data, undefined);
  assert.equal(
    JSON.stringify(response.body).includes("person@example.com"),
    false,
  );
  assert.equal(JSON.stringify(response.body).includes("internal-id"), false);
});
