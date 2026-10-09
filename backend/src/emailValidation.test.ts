import assert from "node:assert/strict";
import { test } from "node:test";

import { preSignupInputSchema } from "./validation/emailSchema.js";

test("email validation trims input, preserves valid local parts, and normalizes domains", () => {
  const ordinary = preSignupInputSchema.parse({
    email: "  Reader@EXAMPLE.com  ",
  });
  const unusualButValid = preSignupInputSchema.parse({
    email: "customer/department=shipping@example.com",
  });

  assert.equal(ordinary.email, "Reader@example.com");
  assert.equal(
    unusualButValid.email,
    "customer/department=shipping@example.com",
  );
});

test("email validation rejects invalid syntax and practical length violations", () => {
  assert.equal(preSignupInputSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(
    preSignupInputSchema.safeParse({
      email: `${"a".repeat(300)}@example.com`,
    }).success,
    false,
  );
});
