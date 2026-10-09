import mongoose, { Types, type QueryFilter, type UpdateQuery } from "mongoose";

import {
  PreSignSchema,
  type PreSignup,
  type SubscriptionStatus,
} from "../models/preSignupModel.js";

export interface VerificationReservationInput {
  attemptId: string;
  cooldownBefore: Date;
  email: string;
  expiresAt: Date;
  now: Date;
  tokenExpiresAt: Date;
  tokenHash: string;
}

export interface VerificationReservation {
  email: string;
  id: string;
}

export type VerificationEmailEventKind =
  | "delivered"
  | "permanent-failure"
  | "temporary-failure";

export interface VerificationEmailEvent {
  email: string;
  eventId: string;
  eventKind: VerificationEmailEventKind;
  eventTime: Date;
  providerMessageId: string;
}

export interface PreSignupRepository {
  consumeVerificationToken(
    tokenHash: string,
    now: Date,
  ): Promise<VerificationReservation | null>;
  isVerified(email: string): Promise<boolean>;
  processVerificationEmailEvent(event: VerificationEmailEvent): Promise<void>;
  recordConfirmationEmail(
    id: string,
    providerMessageId: string,
  ): Promise<void>;
  recordVerificationEmail(
    id: string,
    attemptId: string,
    tokenHash: string,
    providerMessageId: string,
  ): Promise<void>;
  releaseVerificationReservation(
    id: string,
    attemptId: string,
    tokenHash: string,
  ): Promise<void>;
  reserveExistingVerification(
    input: VerificationReservationInput,
  ): Promise<VerificationReservation | null>;
  reserveVerification(
    input: VerificationReservationInput,
  ): Promise<VerificationReservation | null>;
  unsubscribe(id: string, now: Date): Promise<boolean>;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: number }).code === 11000
  );
}

function reservationFilter(
  input: VerificationReservationInput,
): QueryFilter<PreSignup> {
  return {
    emailKey: input.email.toLowerCase(),
    $and: [
      {
        $or: [
          {
            status: mongoose.trusted({
              $in: ["PENDING", "UNSUBSCRIBED"],
            }),
          },
          { status: mongoose.trusted({ $exists: false }) },
        ],
      },
      {
        $or: [
          { verificationSentAt: mongoose.trusted({ $exists: false }) },
          {
            verificationSentAt: mongoose.trusted({
              $lte: input.cooldownBefore,
            }),
          },
        ],
      },
    ],
  };
}

function reservationUpdate(
  input: VerificationReservationInput,
): UpdateQuery<PreSignup> {
  return {
    $set: {
      email: input.email,
      emailKey: input.email.toLowerCase(),
      status: "PENDING" as SubscriptionStatus,
      expiresAt: input.expiresAt,
      verificationAttemptId: input.attemptId,
      verificationExpiresAt: input.tokenExpiresAt,
      verificationSentAt: input.now,
      verificationTokenHash: input.tokenHash,
    },
    $setOnInsert: {
      processedWebhookIds: [],
    },
    $unset: {
      bouncedAt: 1,
      lastDeliveryFailureAt: 1,
      unsubscribedAt: 1,
      verificationDeliveredAt: 1,
      verificationEmailId: 1,
      confirmationDeliveredAt: 1,
      confirmationEmailId: 1,
      verifiedAt: 1,
    },
  };
}

function asReservation(
  document: { _id: Types.ObjectId; email: string } | null,
): VerificationReservation | null {
  return document
    ? { email: document.email, id: document._id.toString() }
    : null;
}

export const mongoosePreSignupRepository: PreSignupRepository = {
  async isVerified(email) {
    const document = await PreSignSchema.exists({
      emailKey: email.toLowerCase(),
      status: "VERIFIED",
    }).exec();

    return document !== null;
  },

  async reserveVerification(input) {
    try {
      const document = await PreSignSchema.findOneAndUpdate(
        reservationFilter(input),
        reservationUpdate(input),
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      )
        .select("+verificationTokenHash")
        .lean<{ _id: Types.ObjectId; email: string }>()
        .exec();

      return asReservation(document);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  },

  async reserveExistingVerification(input) {
    const document = await PreSignSchema.findOneAndUpdate(
      {
        emailKey: input.email.toLowerCase(),
        status: "PENDING",
        $or: [
          { verificationSentAt: mongoose.trusted({ $exists: false }) },
          {
            verificationSentAt: mongoose.trusted({
              $lte: input.cooldownBefore,
            }),
          },
        ],
      },
      reservationUpdate(input),
      { new: true, runValidators: true },
    )
      .select("+verificationTokenHash")
      .lean<{ _id: Types.ObjectId; email: string }>()
      .exec();

    return asReservation(document);
  },

  async recordVerificationEmail(
    id,
    attemptId,
    tokenHash,
    providerMessageId,
  ) {
    const result = await PreSignSchema.updateOne(
      {
        _id: id,
        status: "PENDING",
        verificationAttemptId: attemptId,
        verificationTokenHash: tokenHash,
      },
      { $set: { verificationEmailId: providerMessageId } },
      { runValidators: true },
    );

    if (result.modifiedCount !== 1) {
      throw new Error("Unable to associate the verification email.");
    }
  },

  async releaseVerificationReservation(id, attemptId, tokenHash) {
    await PreSignSchema.updateOne(
      {
        _id: id,
        status: "PENDING",
        verificationAttemptId: attemptId,
        verificationTokenHash: tokenHash,
      },
      {
        $unset: {
          verificationAttemptId: 1,
          verificationEmailId: 1,
          verificationExpiresAt: 1,
          verificationSentAt: 1,
          verificationTokenHash: 1,
        },
      },
    );
  },

  async consumeVerificationToken(tokenHash, now) {
    const document = await PreSignSchema.findOneAndUpdate(
      {
        status: "PENDING",
        verificationTokenHash: tokenHash,
        verificationExpiresAt: mongoose.trusted({ $gt: now }),
      },
      {
        $set: { status: "VERIFIED", verifiedAt: now },
        $unset: {
          bouncedAt: 1,
          unsubscribedAt: 1,
          verificationAttemptId: 1,
          verificationExpiresAt: 1,
          verificationTokenHash: 1,
        },
      },
      { new: true, runValidators: true },
    )
      .select("_id email")
      .lean<{ _id: Types.ObjectId; email: string }>()
      .exec();

    return asReservation(document);
  },

  async recordConfirmationEmail(id, providerMessageId) {
    await PreSignSchema.updateOne(
      { _id: id, status: "VERIFIED" },
      { $set: { confirmationEmailId: providerMessageId } },
      { runValidators: true },
    );
  },

  async unsubscribe(id, now) {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await PreSignSchema.updateOne(
      { _id: id },
      {
        $set: { status: "UNSUBSCRIBED", unsubscribedAt: now },
        $unset: {
          verificationAttemptId: 1,
          verificationExpiresAt: 1,
          verificationTokenHash: 1,
        },
      },
      { runValidators: true },
    );

    return result.matchedCount === 1;
  },

  async processVerificationEmailEvent(event) {
    const commonFilter = {
      emailKey: event.email.toLowerCase(),
      processedWebhookIds: mongoose.trusted({ $ne: event.eventId }),
    };
    const updateFor = (
      deliveredField: "verificationDeliveredAt" | "confirmationDeliveredAt",
    ): UpdateQuery<PreSignup> => {
      if (event.eventKind === "delivered") {
        return {
          $set: { [deliveredField]: event.eventTime },
          $addToSet: { processedWebhookIds: event.eventId },
        };
      }

      if (event.eventKind === "permanent-failure") {
        return {
          $set: {
            bouncedAt: event.eventTime,
            lastDeliveryFailureAt: event.eventTime,
            status: "BOUNCED" as SubscriptionStatus,
          },
          $unset: {
            verificationAttemptId: 1,
            verificationExpiresAt: 1,
            verificationTokenHash: 1,
          },
          $addToSet: { processedWebhookIds: event.eventId },
        };
      }

      return {
        $set: { lastDeliveryFailureAt: event.eventTime },
        $addToSet: { processedWebhookIds: event.eventId },
      };
    };

    const verificationResult = await PreSignSchema.updateOne(
      {
        ...commonFilter,
        status: "PENDING",
        verificationEmailId: event.providerMessageId,
      },
      updateFor("verificationDeliveredAt"),
      { runValidators: true },
    );

    if (verificationResult.matchedCount === 0) {
      await PreSignSchema.updateOne(
        {
          ...commonFilter,
          status: "VERIFIED",
          confirmationEmailId: event.providerMessageId,
        },
        updateFor("confirmationDeliveredAt"),
        { runValidators: true },
      );
    }
  },
};
