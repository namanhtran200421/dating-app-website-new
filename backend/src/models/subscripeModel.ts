import { Schema, model } from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PreSignup {
  email: string;
  emailKey: string;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  bouncedAt?: Date;
  unsubscribedAt?: Date;
  verificationTokenHash?: string;
  verificationExpiresAt?: Date;
  verificationSentAt?: Date;
  verificationAttemptId?: string;
  verificationEmailId?: string;
  verificationDeliveredAt?: Date;
  confirmationEmailId?: string;
  confirmationDeliveredAt?: Date;
  lastDeliveryFailureAt?: Date;
  processedWebhookIds: string[];
}

export const SUBSCRIPTION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "BOUNCED",
  "UNSUBSCRIBED",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const NEWSLETTER_ELIGIBILITY_FILTER = {
  status: "VERIFIED" as const,
};

const preSignupSchema = new Schema<PreSignup>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 254,
      match: EMAIL_PATTERN,
    },
    emailKey: {
      type: String,
      required: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      sparse: true,
      select: false,
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "PENDING",
      required: true,
      index: true,
    },
    verifiedAt: Date,
    bouncedAt: Date,
    unsubscribedAt: Date,
    verificationTokenHash: {
      type: String,
      minlength: 64,
      maxlength: 64,
      select: false,
      index: true,
    },
    verificationExpiresAt: Date,
    verificationSentAt: Date,
    verificationAttemptId: {
      type: String,
      maxlength: 100,
    },
    verificationEmailId: {
      type: String,
      maxlength: 200,
      index: true,
    },
    verificationDeliveredAt: Date,
    confirmationEmailId: {
      type: String,
      maxlength: 200,
      index: true,
    },
    confirmationDeliveredAt: Date,
    lastDeliveryFailureAt: Date,
    processedWebhookIds: {
      type: [String],
      default: [],
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true, strict: "throw" },
);

export const PreSignSchema = model<PreSignup>("PreSignup", preSignupSchema);
