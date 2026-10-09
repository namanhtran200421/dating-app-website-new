import { z } from "zod";
import { normalizedEmailSchema } from "./normalizedEmail.js";

export const preSignupInputSchema = z.strictObject({
  email: normalizedEmailSchema,
});

export const verificationTokenInputSchema = z.strictObject({
  token: z.string().min(32).max(256),
});

export type PreSignupInput = z.infer<typeof preSignupInputSchema>;
