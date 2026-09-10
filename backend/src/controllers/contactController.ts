import type { Request, Response } from "express";
import { retentionExpiry } from "../config/retention.js";
import { ContactMessageSchema } from "../models/contactModel.js";
import { contactInputSchema } from "../validation/contactSchema.js";
import { sendValidationError } from "../validation/validationResponse.js";

export async function createContact(
  req: Request,
  res: Response,
): Promise<Response> {
  res.setHeader("Cache-Control", "no-store");
  const parsed = contactInputSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendValidationError(res, parsed.error);
  }

  try {
    await ContactMessageSchema.create({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      expiresAt: retentionExpiry("CONTACT_RETENTION_DAYS"),
    });
    return res.status(201).json({
      message: "Contact message saved successfully",
      success: true,
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Unable to save contact message", success: false });
  }
}
