import { Schema, model } from "mongoose";
import { CONTACT_SUBJECTS, NAME_PATTERN } from "../validation/contactSchema.js";
import {
  MAX_EMAIL_LENGTH,
  STORED_EMAIL_PATTERN,
} from "../validation/normalizedEmail.js";

export interface ContactMessage {
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

export const ContactMessageSchema = model<ContactMessage>(
  "Contact",
  contactMessageSchema,
);
