import { randomUUID } from "node:crypto";
import type { WebhookEventPayload } from "resend";

import type { SubscriptionConfiguration } from "../config/subscription.js";
import type {
  PreSignupRepository,
  VerificationReservationInput,
} from "../repositories/preSignupRepository.js";
import type { AutoReplyEmailService } from "./autoReplyEmail.js";
import type {
  EmailDomainValidationResult,
  EmailDomainValidator,
} from "./emailDomainValidation.js";
import {
  createUnsubscribeToken,
  createVerificationToken,
  hashVerificationToken,
  verifyUnsubscribeToken,
} from "./subscriptionTokens.js";
import { normalizeEmailAddress } from "../validation/normalizedEmail.js";

const MILLISECONDS_PER_DAY = 86_400_000;

export class InvalidEmailDomainError extends Error {
  constructor(readonly reason: "disposable" | "no-mail") {
    super("The email domain is not eligible for signup.");
  }
}

export class EmailDomainTemporarilyUnavailableError extends Error {}
export class VerificationEmailUnavailableError extends Error {}

export interface PreSignupWorkflow {
  confirmVerification(token: string): Promise<boolean>;
  handleWebhook(eventId: string, event: WebhookEventPayload): Promise<void>;
  requestResend(email: string): Promise<void>;
  submit(email: string): Promise<void>;
  unsubscribe(token: string): Promise<boolean>;
}

export interface PreSignupWorkflowOptions {
  configuration: SubscriptionConfiguration;
  emailDomainValidator: EmailDomainValidator;
  emailService: AutoReplyEmailService;
  now?: () => Date;
  repository: PreSignupRepository;
  retentionDays: number;
}

function eventDate(rawDate: string): Date {
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function permanentBounce(event: WebhookEventPayload): boolean {
  return (
    event.type === "email.bounced" &&
    event.data.bounce.type.toLowerCase() === "permanent"
  );
}

function emailEventKind(
  event: WebhookEventPayload,
): "delivered" | "permanent-failure" | "temporary-failure" | null {
  if (event.type === "email.delivered") return "delivered";
  if (permanentBounce(event)) return "permanent-failure";
  if (event.type === "email.complained" || event.type === "email.suppressed") {
    return "permanent-failure";
  }
  if (event.type === "email.failed" || event.type === "email.delivery_delayed") {
    return "temporary-failure";
  }
  return null;
}

export function createPreSignupWorkflow(
  options: PreSignupWorkflowOptions,
): PreSignupWorkflow {
  const now = options.now ?? (() => new Date());

  async function reserveAndSend(
    email: string,
    mode: "signup" | "resend",
  ): Promise<void> {
    if (mode === "signup") {
      const domainResult: EmailDomainValidationResult =
        await options.emailDomainValidator.validate(email);

      if (domainResult.status === "invalid") {
        throw new InvalidEmailDomainError(domainResult.reason);
      }
      if (domainResult.status === "temporary-failure") {
        throw new EmailDomainTemporarilyUnavailableError();
      }
    }

    const requestedAt = now();
    const verificationToken = createVerificationToken();
    const attemptId = randomUUID();
    const reservationInput: VerificationReservationInput = {
      attemptId,
      cooldownBefore: new Date(
        requestedAt.getTime() - options.configuration.resendCooldownMs,
      ),
      email,
      expiresAt: new Date(
        requestedAt.getTime() + options.retentionDays * MILLISECONDS_PER_DAY,
      ),
      now: requestedAt,
      tokenExpiresAt: new Date(
        requestedAt.getTime() + options.configuration.verificationTtlMs,
      ),
      tokenHash: verificationToken.hash,
    };
    const reservation =
      mode === "signup"
        ? await options.repository.reserveVerification(reservationInput)
        : await options.repository.reserveExistingVerification(reservationInput);

    // A verified, bounced, unknown, or recently emailed address receives the
    // same public response. This prevents account enumeration and email floods.
    if (!reservation) {
      return;
    }

    const unsubscribeToken = createUnsubscribeToken(
      reservation.id,
      options.configuration.linkSecret,
    );
    const verificationUrl = `${options.configuration.publicWebUrl}/email-confirmation#token=${encodeURIComponent(verificationToken.raw)}`;
    const unsubscribeUrl = `${options.configuration.publicWebUrl}/unsubscribe#token=${encodeURIComponent(unsubscribeToken)}`;

    let providerMessageId: string;

    try {
      const delivery = await options.emailService.sendPreSignupVerification({
        attemptId,
        email: reservation.email,
        signupId: reservation.id,
        unsubscribeUrl,
        verificationUrl,
      });
      providerMessageId = delivery.providerMessageId;
    } catch {
      await options.repository.releaseVerificationReservation(
        reservation.id,
        attemptId,
        verificationToken.hash,
      );
      throw new VerificationEmailUnavailableError();
    }

    // If this database write fails, keep the reservation and cooldown in place:
    // Resend already accepted the message, so releasing it could send a duplicate.
    await options.repository.recordVerificationEmail(
      reservation.id,
      attemptId,
      verificationToken.hash,
      providerMessageId,
    );
  }

  return {
    async submit(email): Promise<void> {
      await reserveAndSend(email, "signup");
    },

    async requestResend(email): Promise<void> {
      await reserveAndSend(email, "resend");
    },

    async confirmVerification(token): Promise<boolean> {
      return options.repository.consumeVerificationToken(
        hashVerificationToken(token),
        now(),
      );
    },

    async unsubscribe(token): Promise<boolean> {
      const id = verifyUnsubscribeToken(
        token,
        options.configuration.linkSecret,
      );
      return id ? options.repository.unsubscribe(id, now()) : false;
    },

    async handleWebhook(eventId, event): Promise<void> {
      const kind = emailEventKind(event);

      if (!kind || !("to" in event.data) || !("email_id" in event.data)) {
        return;
      }

      const recipient = event.data.to[0];
      const email = recipient ? normalizeEmailAddress(recipient) : null;

      if (!email) {
        return;
      }

      await options.repository.processVerificationEmailEvent({
        email,
        eventId,
        eventKind: kind,
        eventTime: eventDate(event.created_at),
        providerMessageId: event.data.email_id,
      });
    },
  };
}
