import { Schema, model } from "mongoose";
import { CONTACT_SUBJECTS } from "../validation/contactSchema.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}'’.-]*$/u;

export interface ContactMessage {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
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
      match: EMAIL_PATTERN,
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
  },
  { timestamps: true, strict: "throw" },
);

export const ContactMessageSchema = model<ContactMessage>(
  "Contact",
  contactMessageSchema,
);
