import * as z from "zod";

const emailSchema = z
  .string()
  .trim()
  .normalize()
  .toLowerCase()
  .max(254, { error: "Email is too long." })
  .pipe(z.email({ error: "Please provide a valid email address." }));

export const preSignupInputSchema = z.strictObject({
  email: emailSchema,
});

export type PreSignupInput = z.infer<typeof preSignupInputSchema>;
