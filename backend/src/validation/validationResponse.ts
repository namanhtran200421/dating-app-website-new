import type { Response } from "express";
import type { ZodError } from "zod";

export function sendValidationError(
  res: Response,
  error: ZodError,
): Response {
  return res.status(400).json({
    success: false,
    message: "Invalid form data.",
    errors: error.issues.map((issue) => ({
      field: String(issue.path[0] ?? "body"),
      message: issue.message,
    })),
  });
}