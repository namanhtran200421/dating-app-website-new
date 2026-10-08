import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import request from "supertest";

import { createApp } from "./app.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import { PreSignSchema } from "./models/subscripeModel.js";
import {
  createAutoReplyEmailService,
  type AutoReplyEmailService,
  type ContactAutoReplyInput,
  type PreSignupAutoReplyInput,
} from "./services/autoReplyEmail.js";

const PRODUCTION_ORIGIN = "https://www.rosemarry.app";

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

function createRecordingEmailService(): {
  contactReplies: ContactAutoReplyInput[];
  preSignupReplies: PreSignupAutoReplyInput[];
  service: AutoReplyEmailService;
} {
  const contactReplies: ContactAutoReplyInput[] = [];
  const preSignupReplies: PreSignupAutoReplyInput[] = [];

  return {
    contactReplies,
    preSignupReplies,
    service: {
      async sendContactReply(input): Promise<void> {
        contactReplies.push(input);
      },
      async sendPreSignupReply(input): Promise<void> {
        preSignupReplies.push(input);
      },
    },
  };
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

test("API responses include restrictive security and cache headers", async () => {
  const response = await request(createApp({ nodeEnv: "production" })).get(
    "/api/health",
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
  assert.equal(response.headers["x-robots-tag"], "noindex, nofollow, noarchive");
  assert.match(
    String(response.headers["strict-transport-security"]),
    /max-age=63072000/i,
  );
  assert.match(
    String(response.headers["content-security-policy"]),
    /default-src 'none'/,
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
      .set("Origin", PRODUCTION_ORIGIN)
      .set("X-Forwarded-For", clientIp)
      .send({});

  const first = await submit("203.0.113.10");
  const second = await submit("203.0.113.10");
  const anotherClient = await submit("203.0.113.11");

  assert.equal(first.status, 403);
  assert.equal(remaining(second), remaining(first) - 1);
  assert.equal(remaining(anotherClient), remaining(first));
});

test("rate limiting ignores spoofed CF-Connecting-IP headers", async () => {
  const app = createApp({ nodeEnv: "production", trustedProxyHops: 1 });
  const submit = (cfIp: string) =>
    request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .set("CF-Connecting-IP", cfIp)
      .set("X-Forwarded-For", "203.0.113.1")
      .send({});

  const first = await submit("198.51.100.5");
  const second = await submit("198.51.100.99");

  assert.equal(remaining(second), remaining(first) - 1);
});

test("form endpoints enforce the configured rate limit", async () => {
  const app = createApp({ nodeEnv: "production", trustedProxyHops: false });

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({});
    assert.equal(response.status, 403);
  }

  const limited = await request(app)
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({});
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, {
    success: false,
    message: "Too many requests. Please try again later.",
  });
});

test("form endpoints reject missing, foreign, and non-JSON requests", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Turnstile must not be called for a rejected request.");
  });
  const app = createApp({ nodeEnv: "production" });

  const missingOrigin = await request(app)
    .post("/api/pre-signups")
    .send({ email: "person@example.com", turnstileToken: "token" });
  const foreignOrigin = await request(app)
    .post("/api/pre-signups")
    .set("Origin", "https://attacker.example")
    .send({ email: "person@example.com", turnstileToken: "token" });
  const nonJson = await request(app)
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .set("Content-Type", "text/plain")
    .send("email=person@example.com");

  assert.equal(missingOrigin.status, 403);
  assert.equal(foreignOrigin.status, 403);
  assert.equal(nonJson.status, 415);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("malformed and oversized JSON receive generic JSON errors", async () => {
  const app = createApp({ nodeEnv: "production" });

  const malformed = await request(app)
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .set("Content-Type", "application/json")
    .send('{"broken":');
  const oversized = await request(app)
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
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
      .set("Origin", PRODUCTION_ORIGIN)
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

  const response = await request(app)
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      email: "person@example.com",
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 403);
  assert.equal(updateOne.mock.callCount(), 0);
});

test("Turnstile accepts configured hostnames and rejects an unlisted hostname", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_HOSTNAMES", "www.rosemarry.app,rosemarry.app");
  setEnvironment(t, "PRE_SIGNUP_RETENTION_DAYS", "365");
  let hostname = "rosemarry.app";
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({ success: true, hostname, action: "pre_signup" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  const updateOne = t.mock.method(PreSignSchema, "updateOne", async () => ({
    acknowledged: true,
  }));
  const app = createApp({ nodeEnv: "production" });
  const submit = () =>
    request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({
        email: "person@example.com",
        turnstileToken: "valid-token",
      });

  assert.equal((await submit()).status, 202);
  hostname = "localhost";
  assert.equal((await submit()).status, 403);
  assert.equal(updateOne.mock.callCount(), 1);
});

test("Turnstile rejects submissions without a configured hostname", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_HOSTNAMES", undefined);
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", undefined);
  mockSuccessfulTurnstile(t, "pre_signup");
  const updateOne = t.mock.method(PreSignSchema, "updateOne", async () => ({
    acknowledged: true,
  }));

  const response = await request(createApp({ nodeEnv: "production" }))
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ email: "person@example.com", turnstileToken: "valid-token" });

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

  const response = await request(app)
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "person@example.com",
      subject: "Press",
      message: '<img src=x onerror="alert(1)">',
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
  assert.equal(JSON.stringify(response.body).includes("onerror"), false);
});

test("NoSQL operator payloads are rejected before database access", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "pre_signup");
  const updateOne = t.mock.method(PreSignSchema, "updateOne", async () => ({
    acknowledged: true,
  }));

  const response = await request(createApp({ nodeEnv: "test" }))
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      email: { $ne: null },
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(updateOne.mock.callCount(), 0);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);
});

test("new pre-signups receive one automatic reply", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "PRE_SIGNUP_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "pre_signup");
  let isFirstSignup = true;
  t.mock.method(PreSignSchema, "updateOne", async () => {
    const upsertedId = isFirstSignup ? "signup-record-1" : null;
    isFirstSignup = false;
    return { acknowledged: true, upsertedId };
  });
  const email = createRecordingEmailService();
  const app = createApp({
    autoReplyEmailService: email.service,
    nodeEnv: "test",
  });
  const submit = () =>
    request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({
        email: "New.Person@Example.com",
        turnstileToken: "valid-token",
      });

  assert.equal((await submit()).status, 202);
  assert.equal((await submit()).status, 202);
  assert.deepEqual(email.preSignupReplies, [
    { email: "new.person@example.com", signupId: "signup-record-1" },
  ]);
  assert.deepEqual(email.contactReplies, []);
});

test("contact submissions receive an automatic reply after being stored", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  t.mock.method(ContactMessageSchema, "create", async () => ({
    _id: "contact-record-1",
  }));
  const email = createRecordingEmailService();
  const app = createApp({
    autoReplyEmailService: email.service,
    nodeEnv: "test",
  });

  const response = await request(app)
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "Person@Example.com",
      subject: "Feedback",
      message: "Hello",
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 201);
  assert.deepEqual(email.contactReplies, [
    {
      email: "person@example.com",
      firstName: "Rose",
      subject: "Feedback",
      submissionId: "contact-record-1",
    },
  ]);
  assert.deepEqual(email.preSignupReplies, []);
});

test("Resend requests use the registered sender and stable idempotency keys", async (t) => {
  const requests: Array<{ body: Record<string, unknown>; headers: Headers }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        headers: new Headers(init?.headers),
      });
      return new Response(JSON.stringify({ id: "email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  const emailService = createAutoReplyEmailService("test", "re_test_key");

  await emailService.sendContactReply({
    email: "contact@example.com",
    firstName: "Rose",
    subject: "Feedback",
    submissionId: "contact-record-1",
  });
  await emailService.sendPreSignupReply({
    email: "signup@example.com",
    signupId: "signup-record-1",
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.body.from, "Rosemarry <noreply@rosemarry.app>");
  assert.deepEqual(requests[0]?.body.to, ["contact@example.com"]);
  assert.equal(
    requests[0]?.headers.get("idempotency-key"),
    "contact-received/contact-record-1",
  );
  assert.equal(requests[1]?.body.from, "Rosemarry <noreply@rosemarry.app>");
  assert.deepEqual(requests[1]?.body.to, ["signup@example.com"]);
  assert.equal(
    requests[1]?.headers.get("idempotency-key"),
    "early-access-welcome/signup-record-1",
  );
  assert.match(String(requests[0]?.body.html), /We got your message/);
  assert.match(String(requests[1]?.body.text), /You're on the list/);
});
