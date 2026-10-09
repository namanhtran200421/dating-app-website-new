import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import request from "supertest";
import type { WebhookEventPayload } from "resend";

import { createApp } from "./app.js";
import { ContactMessageSchema } from "./models/contactModel.js";
import {
  createAutoReplyEmailService,
  type AutoReplyEmailService,
  type ContactAutoReplyInput,
  type PreSignupAutoReplyInput,
  type PreSignupConfirmationInput,
} from "./services/autoReplyEmail.js";
import {
  CONTACT_REFERENCE_PATTERN,
  createContactReference,
} from "./services/contactReference.js";
import type { PreSignupWorkflow } from "./services/preSignupWorkflow.js";
import { CONTACT_SUBJECTS } from "./validation/contactSchema.js";
import type { ResendWebhookVerifier } from "./services/resendWebhook.js";

const PRODUCTION_ORIGIN = "https://www.rosemarry.app";
const VALID_TOKEN = "a".repeat(43);

function setEnvironment(
  t: TestContext,
  key: string,
  value: string | undefined,
): void {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;

  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
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
  action: "contact" | "pre_signup" | "pre_signup_resend",
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

function createRecordingWorkflow(overrides: Partial<PreSignupWorkflow> = {}): {
  confirmedTokens: string[];
  emails: string[];
  resentEmails: string[];
  unsubscribedTokens: string[];
  webhookIds: string[];
  workflow: PreSignupWorkflow;
} {
  const confirmedTokens: string[] = [];
  const emails: string[] = [];
  const resentEmails: string[] = [];
  const unsubscribedTokens: string[] = [];
  const webhookIds: string[] = [];

  return {
    confirmedTokens,
    emails,
    resentEmails,
    unsubscribedTokens,
    webhookIds,
    workflow: {
      async submit(email) {
        emails.push(email);
        return "verification-sent" as const;
      },
      async requestResend(email): Promise<void> {
        resentEmails.push(email);
      },
      async confirmVerification(token) {
        confirmedTokens.push(token);
        return { receiptSent: true, verified: true };
      },
      async unsubscribe(token): Promise<boolean> {
        unsubscribedTokens.push(token);
        return true;
      },
      async handleWebhook(eventId): Promise<void> {
        webhookIds.push(eventId);
      },
      ...overrides,
    },
  };
}

function createRecordingEmailService(): {
  confirmations: PreSignupConfirmationInput[];
  contactReplies: ContactAutoReplyInput[];
  preSignupReplies: PreSignupAutoReplyInput[];
  service: AutoReplyEmailService;
} {
  const contactReplies: ContactAutoReplyInput[] = [];
  const preSignupReplies: PreSignupAutoReplyInput[] = [];
  const confirmations: PreSignupConfirmationInput[] = [];

  return {
    confirmations,
    contactReplies,
    preSignupReplies,
    service: {
      async sendContactReply(input): Promise<void> {
        contactReplies.push(input);
      },
      async sendPreSignupVerification(input) {
        preSignupReplies.push(input);
        return { providerMessageId: "recorded-email-id" };
      },
      async sendPreSignupConfirmation(input) {
        confirmations.push(input);
        return { providerMessageId: "recorded-confirmation-id" };
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
    .set("Origin", PRODUCTION_ORIGIN);

  assert.equal(local.headers["access-control-allow-origin"], undefined);
  assert.equal(
    production.headers["access-control-allow-origin"],
    PRODUCTION_ORIGIN,
  );
});

test("health reports 503 while the database is unavailable", async () => {
  let ready = false;
  const app = createApp({ isReady: () => ready, nodeEnv: "production" });

  assert.equal((await request(app).get("/api/health")).status, 503);
  ready = true;
  assert.equal((await request(app).get("/api/health")).status, 200);
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
  assert.match(String(response.headers["content-security-policy"]), /default-src 'none'/);
});

test("rate limiting keys by trusted proxy IP and ignores spoofed CF headers", async () => {
  const app = createApp({ nodeEnv: "production", trustedProxyHops: 1 });
  const submit = (forwardedIp: string, cloudflareIp: string) =>
    request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .set("X-Forwarded-For", forwardedIp)
      .set("CF-Connecting-IP", cloudflareIp)
      .send({});

  const first = await submit("203.0.113.10", "198.51.100.1");
  const second = await submit("203.0.113.10", "198.51.100.2");
  const anotherClient = await submit("203.0.113.11", "198.51.100.1");

  assert.equal(first.status, 403);
  assert.equal(remaining(second), remaining(first) - 1);
  assert.equal(remaining(anotherClient), remaining(first));
});

test("signup and resend endpoints enforce separate limits", async () => {
  const app = createApp({ nodeEnv: "production", trustedProxyHops: false });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request(app)
      .post("/api/pre-signups/resend")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({});
    assert.equal(response.status, 403);
  }

  const limited = await request(app)
    .post("/api/pre-signups/resend")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({});
  assert.equal(limited.status, 429);
  assert.match(String(limited.headers["ratelimit-policy"]), /q=3/);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({});
    assert.equal(response.status, 403);
  }

  const signupLimited = await request(app)
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({});
  assert.equal(signupLimited.status, 429);
  assert.match(String(signupLimited.headers["ratelimit-policy"]), /q=10/);
});

test("form endpoints reject missing origins and non-JSON requests", async () => {
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
});

test("malformed and oversized JSON receive generic errors", async () => {
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
  assert.equal(oversized.status, 413);
});

test("valid signups require Turnstile and delegate a normalized email", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "pre_signup");
  const recording = createRecordingWorkflow();
  const app = createApp({
    nodeEnv: "test",
    preSignupWorkflow: recording.workflow,
  });

  const response = await request(app)
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ email: "  Reader@EXAMPLE.com ", turnstileToken: "valid-token" });

  assert.equal(response.status, 202);
  assert.deepEqual(recording.emails, ["Reader@example.com"]);
  assert.equal(JSON.stringify(response.body).includes("Reader@example.com"), false);
});

test("Turnstile rejects a mismatched action before workflow execution", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "contact");
  const recording = createRecordingWorkflow();

  const response = await request(
    createApp({ nodeEnv: "test", preSignupWorkflow: recording.workflow }),
  )
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ email: "person@example.com", turnstileToken: "valid-token" });

  assert.equal(response.status, 403);
  assert.deepEqual(recording.emails, []);
});

test("NoSQL operator payloads are rejected before workflow execution", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "pre_signup");
  const recording = createRecordingWorkflow();

  const response = await request(
    createApp({ nodeEnv: "test", preSignupWorkflow: recording.workflow }),
  )
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ email: { $ne: null }, turnstileToken: "valid-token" });

  assert.equal(response.status, 400);
  assert.deepEqual(recording.emails, []);
});

test("duplicate signup submissions receive the same generic response", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "pre_signup");
  const recording = createRecordingWorkflow();
  const app = createApp({
    nodeEnv: "test",
    preSignupWorkflow: recording.workflow,
  });
  const submit = () =>
    request(app)
      .post("/api/pre-signups")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({ email: "person@example.com", turnstileToken: "valid-token" });

  const first = await submit();
  const second = await submit();
  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.deepEqual(first.body, second.body);
});

test("a confirmed address gets an already-listed response", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  mockSuccessfulTurnstile(t, "pre_signup");
  const recording = createRecordingWorkflow({
    async submit() {
      return "already-listed";
    },
  });
  const response = await request(
    createApp({ nodeEnv: "test", preSignupWorkflow: recording.workflow }),
  )
    .post("/api/pre-signups")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ email: "person@example.com", turnstileToken: "valid-token" });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "already-listed");
});

test("verification and unsubscribe tokens are handled without CAPTCHA", async () => {
  let verificationResult = true;
  const recording = createRecordingWorkflow({
    async confirmVerification() {
      const result = verificationResult;
      verificationResult = false;
      return { receiptSent: result, verified: result };
    },
  });
  const app = createApp({
    nodeEnv: "production",
    preSignupWorkflow: recording.workflow,
  });

  const verified = await request(app)
    .post("/api/pre-signups/verify")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ token: VALID_TOKEN });
  const replayed = await request(app)
    .post("/api/pre-signups/verify")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ token: VALID_TOKEN });
  const unsubscribed = await request(app)
    .post("/api/pre-signups/unsubscribe")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({ token: VALID_TOKEN });

  assert.equal(verified.status, 200);
  assert.equal(replayed.status, 400);
  assert.equal(unsubscribed.status, 200);
  assert.deepEqual(recording.unsubscribedTokens, [VALID_TOKEN]);
});

test("authenticated webhooks are delegated and invalid signatures are rejected", async () => {
  const event = {
    type: "email.delivered",
    created_at: "2026-10-09T00:00:00.000Z",
    data: {
      created_at: "2026-10-09T00:00:00.000Z",
      email_id: "email-1",
      from: "noreply@rosemarry.app",
      message_id: "message-1",
      subject: "Confirm",
      to: ["person@example.com"],
    },
  } satisfies WebhookEventPayload;
  const verifier: ResendWebhookVerifier = {
    verify(_payload, headers) {
      if (headers.signature !== "valid-signature") throw new Error("invalid");
      return event;
    },
  };
  const recording = createRecordingWorkflow();
  const app = createApp({
    nodeEnv: "production",
    preSignupWorkflow: recording.workflow,
    resendWebhookVerifier: verifier,
  });
  const sendWebhook = (signature: string) =>
    request(app)
      .post("/api/webhooks/resend")
      .set("Content-Type", "application/json")
      .set("svix-id", "event-1")
      .set("svix-timestamp", "123456")
      .set("svix-signature", signature)
      .send(JSON.stringify(event));

  assert.equal((await sendWebhook("invalid")).status, 400);
  assert.equal((await sendWebhook("valid-signature")).status, 200);
  assert.deepEqual(recording.webhookIds, ["event-1"]);

  const unavailable = createRecordingWorkflow({
    async handleWebhook(): Promise<void> {
      throw new Error("database unavailable");
    },
  });
  const retryableApp = createApp({
    nodeEnv: "production",
    preSignupWorkflow: unavailable.workflow,
    resendWebhookVerifier: verifier,
  });
  const retryable = await request(retryableApp)
    .post("/api/webhooks/resend")
    .set("Content-Type", "application/json")
    .set("svix-id", "event-2")
    .set("svix-timestamp", "123456")
    .set("svix-signature", "valid-signature")
    .send(JSON.stringify(event));
  assert.equal(retryable.status, 503);
});

test("contact success does not echo personal data and sends a receipt", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  t.mock.method(ContactMessageSchema, "create", async (fields: { referenceId: string }) => ({
    _id: "contact-record-1",
    referenceId: fields.referenceId,
  }));
  const email = createRecordingEmailService();
  const response = await request(
    createApp({ autoReplyEmailService: email.service, nodeEnv: "test" }),
  )
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "Person@Example.com",
      subject: "Feedback",
      message: '<img src=x onerror="alert(1)">',
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 201);
  assert.equal(JSON.stringify(response.body).includes("onerror"), false);
  assert.equal(JSON.stringify(response.body).includes("Person@"), false);
  assert.match(response.body.referenceId, CONTACT_REFERENCE_PATTERN);
  assert.deepEqual(email.contactReplies, [
    {
      email: "Person@example.com",
      firstName: "Rose",
      subject: "Feedback",
      referenceId: response.body.referenceId,
      submissionId: "contact-record-1",
    },
  ]);
});

test("contact retries with a fresh reference when one is already taken", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  const triedReferences: string[] = [];
  t.mock.method(ContactMessageSchema, "create", async (fields: { referenceId: string }) => {
    triedReferences.push(fields.referenceId);
    if (triedReferences.length === 1) {
      throw Object.assign(new Error("E11000 duplicate key"), {
        code: 11000,
        keyPattern: { referenceId: 1 },
      });
    }
    return { _id: "contact-record-2", referenceId: fields.referenceId };
  });
  const email = createRecordingEmailService();
  const response = await request(
    createApp({ autoReplyEmailService: email.service, nodeEnv: "test" }),
  )
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "person@example.com",
      subject: "Press",
      message: "Hello",
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 201);
  assert.equal(triedReferences.length, 2);
  assert.equal(response.body.referenceId, triedReferences[1]);
  assert.equal(email.contactReplies[0]?.referenceId, triedReferences[1]);
});

test("contact references are readable and unambiguous", () => {
  for (let index = 0; index < 500; index += 1) {
    const reference = createContactReference();
    assert.match(reference, CONTACT_REFERENCE_PATTERN);
    assert.doesNotMatch(reference.slice(3), /[01ILO]/);
  }
});

test("each contact subject gets its own auto-reply carrying the reference", async (t) => {
  const requests: Array<Record<string, unknown>> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: string | URL | Request, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ id: "email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  const service = createAutoReplyEmailService("test", "re_test_key");

  for (const subject of CONTACT_SUBJECTS) {
    await service.sendContactReply({
      email: "person@example.com",
      firstName: "Rose",
      subject,
      referenceId: "RM-7K3P-9QXA",
      submissionId: `record-${subject}`,
    });
  }

  assert.equal(requests.length, CONTACT_SUBJECTS.length);
  assert.equal(new Set(requests.map((body) => body.subject)).size, CONTACT_SUBJECTS.length);
  assert.equal(new Set(requests.map((body) => body.html)).size, CONTACT_SUBJECTS.length);
  for (const body of requests) {
    assert.match(String(body.subject), /\[RM-7K3P-9QXA\]$/);
    assert.match(String(body.text), /Your reference: RM-7K3P-9QXA/);
    assert.match(String(body.html), /RM-7K3P-9QXA/);
  }
  assert.match(String(requests[1]?.html), /title-contact-feedback\.png/);
  assert.match(String(requests[1]?.text), /yours helps shape Rosemarry/);
});

test("contact rejects the same email domains as pre-signup without saving or replying", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  const create = t.mock.method(ContactMessageSchema, "create", async (fields: { referenceId: string }) => ({
    _id: "contact-record-1",
    referenceId: fields.referenceId,
  }));
  const email = createRecordingEmailService();
  const validatedEmails: string[] = [];
  const response = await request(
    createApp({
      autoReplyEmailService: email.service,
      emailDomainValidator: {
        async validate(address) {
          validatedEmails.push(address);
          return { status: "invalid", reason: "disposable" };
        },
      },
      nodeEnv: "test",
    }),
  )
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "Person@Mailinator.com",
      subject: "Feedback",
      message: "Hello",
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Please use a permanent email address.");
  assert.deepEqual(validatedEmails, ["Person@mailinator.com"]);
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(email.contactReplies, []);
});

test("contact keeps the message when the email domain check is temporarily unavailable", async (t) => {
  setEnvironment(t, "TURNSTILE_SECRET", "test-secret");
  setEnvironment(t, "TURNSTILE_EXPECTED_HOSTNAME", "www.rosemarry.app");
  setEnvironment(t, "CONTACT_RETENTION_DAYS", "365");
  mockSuccessfulTurnstile(t, "contact");
  t.mock.method(ContactMessageSchema, "create", async (fields: { referenceId: string }) => ({
    _id: "contact-record-1",
    referenceId: fields.referenceId,
  }));
  const email = createRecordingEmailService();
  const response = await request(
    createApp({
      autoReplyEmailService: email.service,
      emailDomainValidator: {
        async validate() {
          return { status: "temporary-failure" };
        },
      },
      nodeEnv: "test",
    }),
  )
    .post("/api/contact")
    .set("Origin", PRODUCTION_ORIGIN)
    .send({
      firstName: "Rose",
      lastName: "Marry",
      email: "person@example.com",
      subject: "Feedback",
      message: "Hello",
      turnstileToken: "valid-token",
    });

  assert.equal(response.status, 201);
  assert.equal(email.contactReplies.length, 1);
});

test("Resend subscription emails use registered sender and stable idempotency keys", async (t) => {
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
  const service = createAutoReplyEmailService("test", "re_test_key");
  const receipt = await service.sendPreSignupVerification({
    attemptId: "attempt-1",
    email: "signup@example.com",
    signupId: "507f1f77bcf86cd799439011",
    unsubscribeUrl: "https://www.rosemarry.app/unsubscribe#token=unsubscribe",
    verificationUrl:
      "https://www.rosemarry.app/email-confirmation#token=verification",
  });

  assert.deepEqual(receipt, { providerMessageId: "email-id" });
  assert.equal(requests[0]?.body.from, "Rosemarry <noreply@rosemarry.app>");
  assert.deepEqual(requests[0]?.body.to, ["signup@example.com"]);
  assert.equal(
    requests[0]?.headers.get("idempotency-key"),
    "early-access-verification/attempt-1",
  );
  assert.match(String(requests[0]?.body.text), /Confirm that you want/);
  assert.match(String(requests[0]?.body.html), /email-confirmation#token=/);

  const confirmationReceipt = await service.sendPreSignupConfirmation({
    email: "signup@example.com",
    signupId: "507f1f77bcf86cd799439011",
    unsubscribeUrl: "https://www.rosemarry.app/unsubscribe#token=unsubscribe",
  });

  assert.deepEqual(confirmationReceipt, { providerMessageId: "email-id" });
  assert.equal(requests[1]?.body.from, "Rosemarry <noreply@rosemarry.app>");
  assert.deepEqual(requests[1]?.body.to, ["signup@example.com"]);
  assert.equal(
    requests[1]?.headers.get("idempotency-key"),
    "early-access-confirmed/507f1f77bcf86cd799439011",
  );
  assert.match(String(requests[1]?.body.text), /You're confirmed/);
  assert.match(String(requests[1]?.body.html), /Email confirmed/);
});
