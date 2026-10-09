import assert from "node:assert/strict";
import { test } from "node:test";
import type { WebhookEventPayload } from "resend";

import type { SubscriptionConfiguration } from "./config/subscription.js";
import type {
  PreSignupRepository,
  VerificationEmailEvent,
  VerificationReservationInput,
} from "./repositories/preSignupRepository.js";
import type {
  AutoReplyEmailService,
  PreSignupAutoReplyInput,
  PreSignupConfirmationInput,
} from "./services/autoReplyEmail.js";
import {
  createPreSignupWorkflow,
  VerificationEmailUnavailableError,
} from "./services/preSignupWorkflow.js";
import { hashVerificationToken } from "./services/subscriptionTokens.js";

const ID = "507f1f77bcf86cd799439011";
const CONFIGURATION: SubscriptionConfiguration = {
  blockDisposableEmails: true,
  dnsTimeoutMs: 100,
  linkSecret: "a-production-length-test-secret-value",
  publicWebUrl: "https://www.rosemarry.app",
  resendCooldownMs: 300_000,
  verificationTtlMs: 3_600_000,
};

class InMemoryRepository implements PreSignupRepository {
  attemptId: string | undefined = undefined;
  email: string | undefined = undefined;
  expiresAt: Date | undefined = undefined;
  providerMessageId: string | undefined = undefined;
  released = 0;
  sentAt: Date | undefined = undefined;
  status: "NONE" | "PENDING" | "VERIFIED" | "BOUNCED" | "UNSUBSCRIBED" =
    "NONE";
  tokenExpiresAt: Date | undefined = undefined;
  tokenHash: string | undefined = undefined;
  processedEvents = new Set<string>();
  webhookUpdates: VerificationEmailEvent[] = [];

  async isVerified(email: string): Promise<boolean> {
    return this.status === "VERIFIED" && email.toLowerCase() === this.email?.toLowerCase();
  }

  async reserveVerification(input: VerificationReservationInput) {
    if (this.status === "VERIFIED" || this.status === "BOUNCED") return null;
    if (this.sentAt && this.sentAt > input.cooldownBefore) return null;
    this.applyReservation(input);
    return { email: input.email, id: ID };
  }

  async reserveExistingVerification(input: VerificationReservationInput) {
    if (this.status !== "PENDING") return null;
    if (this.sentAt && this.sentAt > input.cooldownBefore) return null;
    this.applyReservation(input);
    return { email: input.email, id: ID };
  }

  private applyReservation(input: VerificationReservationInput): void {
    this.attemptId = input.attemptId;
    this.email = input.email;
    this.expiresAt = input.expiresAt;
    this.sentAt = input.now;
    this.status = "PENDING";
    this.tokenExpiresAt = input.tokenExpiresAt;
    this.tokenHash = input.tokenHash;
  }

  async recordVerificationEmail(
    _id: string,
    attemptId: string,
    tokenHash: string,
    providerMessageId: string,
  ): Promise<void> {
    assert.equal(attemptId, this.attemptId);
    assert.equal(tokenHash, this.tokenHash);
    this.providerMessageId = providerMessageId;
  }

  async releaseVerificationReservation(): Promise<void> {
    this.released += 1;
    this.attemptId = undefined;
    this.sentAt = undefined;
    this.tokenExpiresAt = undefined;
    this.tokenHash = undefined;
  }

  async consumeVerificationToken(tokenHash: string, now: Date) {
    if (
      this.status !== "PENDING" ||
      tokenHash !== this.tokenHash ||
      !this.tokenExpiresAt ||
      this.tokenExpiresAt <= now
    ) {
      return null;
    }
    this.status = "VERIFIED";
    this.tokenHash = undefined;
    return { email: this.email!, id: ID };
  }

  async recordConfirmationEmail(
    _id: string,
    providerMessageId: string,
  ): Promise<void> {
    this.providerMessageId = providerMessageId;
  }

  async unsubscribe(id: string): Promise<boolean> {
    if (id !== ID) return false;
    this.status = "UNSUBSCRIBED";
    this.tokenHash = undefined;
    return true;
  }

  async processVerificationEmailEvent(
    event: VerificationEmailEvent,
  ): Promise<void> {
    if (
      this.status !== "PENDING" ||
      event.email !== this.email ||
      event.providerMessageId !== this.providerMessageId ||
      this.processedEvents.has(event.eventId)
    ) {
      return;
    }
    this.processedEvents.add(event.eventId);
    this.webhookUpdates.push(event);
    if (event.eventKind === "permanent-failure") this.status = "BOUNCED";
  }
}

function verificationTokenFrom(input: PreSignupAutoReplyInput): string {
  const fragment = new URL(input.verificationUrl).hash;
  return decodeURIComponent(fragment.slice("#token=".length));
}

function setup(
  options: { confirmationFails?: boolean; emailFails?: boolean } = {},
) {
  let currentTime = new Date("2026-10-09T00:00:00.000Z");
  const repository = new InMemoryRepository();
  const emails: PreSignupAutoReplyInput[] = [];
  const confirmations: PreSignupConfirmationInput[] = [];
  const emailService: AutoReplyEmailService = {
    async sendContactReply(): Promise<void> {},
    async sendPreSignupVerification(input) {
      emails.push(input);
      if (options.emailFails) throw new Error("provider unavailable");
      return { providerMessageId: `provider-${emails.length}` };
    },
    async sendPreSignupConfirmation(input) {
      confirmations.push(input);
      if (options.confirmationFails) throw new Error("provider unavailable");
      return { providerMessageId: `confirmation-${confirmations.length}` };
    },
  };
  const workflow = createPreSignupWorkflow({
    configuration: CONFIGURATION,
    emailDomainValidator: {
      async validate() {
        return { status: "valid" };
      },
    },
    emailService,
    now: () => new Date(currentTime),
    repository,
    retentionDays: 365,
  });

  return {
    confirmations,
    emails,
    repository,
    workflow,
    advance(milliseconds: number): void {
      currentTime = new Date(currentTime.getTime() + milliseconds);
    },
  };
}

test("stores only a token hash and keeps the signup pending", async () => {
  const context = setup();
  await context.workflow.submit("person@example.com");

  assert.equal(context.emails.length, 1);
  const token = verificationTokenFrom(context.emails[0]!);
  assert.equal(context.repository.tokenHash, hashVerificationToken(token));
  assert.notEqual(context.repository.tokenHash, token);
  assert.equal(context.repository.status, "PENDING");
  assert.equal(context.repository.providerMessageId, "provider-1");
});

test("a confirmed address is told it is already listed and gets no new email", async () => {
  const context = setup();
  assert.equal(await context.workflow.submit("person@example.com"), "verification-sent");
  const verification = await context.workflow.confirmVerification(
    verificationTokenFrom(context.emails[0]!),
  );
  assert.equal(verification.verified, true);

  context.advance(CONFIGURATION.resendCooldownMs + 1);
  assert.equal(await context.workflow.submit("Person@Example.com"), "already-listed");
  assert.equal(context.emails.length, 1);
  assert.equal(context.repository.status, "VERIFIED");
});

test("duplicates and cooldown retries do not flood verification emails", async () => {
  const context = setup();
  await context.workflow.submit("person@example.com");
  await context.workflow.submit("Person@EXAMPLE.com");
  await context.workflow.requestResend("person@example.com");
  assert.equal(context.emails.length, 1);

  context.advance(CONFIGURATION.resendCooldownMs + 1);
  await context.workflow.requestResend("person@example.com");
  assert.equal(context.emails.length, 2);
});

test("provider failures release the reservation for a safe retry", async () => {
  const context = setup({ emailFails: true });
  await assert.rejects(
    context.workflow.submit("person@example.com"),
    VerificationEmailUnavailableError,
  );
  assert.equal(context.repository.released, 1);
  assert.equal(context.repository.tokenHash, undefined);
});

test("verification tokens expire, reject invalid values, and are single-use atomically", async () => {
  const valid = setup();
  await valid.workflow.submit("person@example.com");
  const token = verificationTokenFrom(valid.emails[0]!);
  const concurrent = await Promise.all([
    valid.workflow.confirmVerification(token),
    valid.workflow.confirmVerification(token),
  ]);
  assert.equal(concurrent.filter((result) => result.verified).length, 1);
  assert.equal(concurrent.filter((result) => result.receiptSent).length, 1);
  assert.equal(valid.confirmations.length, 1);
  assert.equal(valid.confirmations[0]!.email, "person@example.com");
  assert.equal(valid.confirmations[0]!.signupId, ID);
  assert.match(valid.confirmations[0]!.unsubscribeUrl, /\/unsubscribe#token=/);
  assert.equal(valid.repository.providerMessageId, "confirmation-1");
  assert.deepEqual(await valid.workflow.confirmVerification("wrong-token"), {
    receiptSent: false,
    verified: false,
  });

  const expired = setup();
  await expired.workflow.submit("person@example.com");
  const expiredToken = verificationTokenFrom(expired.emails[0]!);
  expired.advance(CONFIGURATION.verificationTtlMs + 1);
  assert.deepEqual(await expired.workflow.confirmVerification(expiredToken), {
    receiptSent: false,
    verified: false,
  });
});

test("confirmation remains successful when its receipt cannot be sent", async (t) => {
  t.mock.method(console, "error", () => {});
  const context = setup({ confirmationFails: true });
  await context.workflow.submit("person@example.com");
  const token = verificationTokenFrom(context.emails[0]!);

  assert.deepEqual(await context.workflow.confirmVerification(token), {
    receiptSent: false,
    verified: true,
  });
  assert.equal(context.repository.status, "VERIFIED");
  assert.equal(context.confirmations.length, 1);
  assert.deepEqual(await context.workflow.confirmVerification(token), {
    receiptSent: false,
    verified: false,
  });
});

test("signed unsubscribe links work without login and reject tampering", async () => {
  const context = setup();
  await context.workflow.submit("person@example.com");
  const fragment = new URL(context.emails[0]!.unsubscribeUrl).hash;
  const token = decodeURIComponent(fragment.slice("#token=".length));

  assert.equal(await context.workflow.unsubscribe(`${token}tampered`), false);
  assert.equal(await context.workflow.unsubscribe(token), true);
  assert.equal(context.repository.status, "UNSUBSCRIBED");
});

test("bounce webhooks are idempotent and cannot overwrite a newer email", async () => {
  const context = setup();
  await context.workflow.submit("person@example.com");
  const permanentBounce = {
    type: "email.bounced",
    created_at: "2026-10-09T00:05:00.000Z",
    data: {
      bounce: { message: "mailbox missing", subType: "General", type: "Permanent" },
      created_at: "2026-10-09T00:04:00.000Z",
      email_id: "provider-1",
      from: "noreply@rosemarry.app",
      message_id: "message-1",
      subject: "Confirm",
      to: ["person@example.com"],
    },
  } satisfies WebhookEventPayload;

  await context.workflow.handleWebhook("event-1", permanentBounce);
  await context.workflow.handleWebhook("event-1", permanentBounce);
  assert.equal(context.repository.webhookUpdates.length, 1);
  assert.equal(context.repository.status, "BOUNCED");

  const newer = setup();
  await newer.workflow.submit("person@example.com");
  newer.repository.providerMessageId = "provider-newer";
  await newer.workflow.handleWebhook("event-old", permanentBounce);
  assert.equal(newer.repository.status, "PENDING");
  assert.equal(newer.repository.webhookUpdates.length, 0);
});

test("database failures are propagated without sending email", async () => {
  const context = setup();
  context.repository.reserveVerification = async () => {
    throw new Error("database unavailable");
  };

  await assert.rejects(context.workflow.submit("person@example.com"));
  assert.equal(context.emails.length, 0);
});
