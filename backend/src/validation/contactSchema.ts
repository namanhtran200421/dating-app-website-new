// schemas/contactSchema.ts

import { z } from "zod";

export const CONTACT_SUBJECTS = [
  "General question",
  "Feedback",
  "Partnerships",
] as const;

const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

const NAME_PATTERN =
  /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}'’.-]*$/u;

const emailSchema = z
  .string()
  .trim()
  .normalize()
  .toLowerCase()
  .max(254, { error: "Email is too long." })
  .pipe(z.email({ error: "Please provide a valid email address." }));

const nameSchema = z
  .string()
  .trim()
  .normalize()
  .min(1, { error: "Name is required." })
  .max(100, { error: "Name is too long." })
  .refine((value) => NAME_PATTERN.test(value), {
    error: "Name contains unsupported characters.",
  });

const messageSchema = z
  .string()
  .trim()
  .normalize()
  .min(1, { error: "Message is required." })
  .max(5000, { error: "Message is too long." })
  .refine((value) => !UNSAFE_CONTROL_CHARACTERS.test(value), {
    error: "Message contains unsupported control characters.",
  });


export const contactInputSchema = z.strictObject({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  subject: z.enum(CONTACT_SUBJECTS, {
    error: "Please select a valid subject.",
  }),
  message: messageSchema,
});

export type ContactInput = z.infer<typeof contactInputSchema>;