import { Schema, model } from "mongoose";
import { CONTACT_REFERENCE_PATTERN } from "../services/contactReference.js";
import { CONTACT_SUBJECTS, NAME_PATTERN } from "../validation/contactSchema.js";
import {
  MAX_EMAIL_LENGTH,
  STORED_EMAIL_PATTERN,
} from "../validation/normalizedEmail.js";

export interface ContactMessage {
  referenceId: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  expiresAt: Date;
}

const contactMessageSchema = new Schema<ContactMessage>(
  {
    // Shown to the sender in their auto-reply; support looks messages up by it.
    referenceId: {
      type: String,
      required: true,
      match: CONTACT_REFERENCE_PATTERN,
      immutable: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      match: NAME_PATTERN,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      match: NAME_PATTERN,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_EMAIL_LENGTH,
      match: STORED_EMAIL_PATTERN,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      enum: CONTACT_SUBJECTS,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxlength: 5000,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true, strict: "throw" },
);

// Sparse because messages saved before reference IDs existed have none.
contactMessageSchema.index({ referenceId: 1 }, { unique: true, sparse: true });

export const ContactMessageSchema = model<ContactMessage>(
  "Contact",
  contactMessageSchema,
);
