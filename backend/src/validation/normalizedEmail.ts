import { domainToASCII } from "node:url";
import validator from "validator";
import { z } from "zod";

export function normalizeEmailAddress(value: string): string | null {
  const normalized = value.trim().normalize("NFC");
  const separator = normalized.lastIndexOf("@");

  if (separator <= 0 || separator === normalized.length - 1) {
    return null;
  }

  const localPart = normalized.slice(0, separator);
  const asciiDomain = domainToASCII(normalized.slice(separator + 1).toLowerCase());

  if (!asciiDomain) {
    return null;
  }

  const email = `${localPart}@${asciiDomain}`;

  return validator.isEmail(email, {
    allow_display_name: false,
    allow_ip_domain: false,
    allow_utf8_local_part: true,
    domain_specific_validation: false,
    ignore_max_length: false,
    require_tld: true,
  })
    ? email
    : null;
}

// Coarse shape check for Mongoose validators; request input is validated by normalizedEmailSchema.
export const STORED_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 320;

export const normalizedEmailSchema = z
  .string()
  .max(MAX_EMAIL_LENGTH, { error: "Email is too long." })
  .transform((value, context) => {
    const email = normalizeEmailAddress(value);

    if (!email) {
      context.addIssue({
        code: "custom",
        message: "Please provide a valid email address.",
      });
      return z.NEVER;
    }

    return email;
  });
