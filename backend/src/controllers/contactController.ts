import type { Request, Response } from "express";
import { retentionExpiry } from "../config/retention.js";
import { ContactMessageSchema } from "../models/contactModel.js";
import type { AutoReplyEmailService } from "../services/autoReplyEmail.js";
import { contactInputSchema } from "../validation/contactSchema.js";
import { sendValidationError } from "../validation/validationResponse.js";

export function createContactController(emailService: AutoReplyEmailService) {
  return async function createContact(
    req: Request,
    res: Response,
  ): Promise<Response> {
    res.setHeader("Cache-Control", "no-store");
    const parsed = contactInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      const contact = await ContactMessageSchema.create({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        expiresAt: retentionExpiry("CONTACT_RETENTION_DAYS"),
      });

      try {
        await emailService.sendContactReply({
          email: parsed.data.email,
          firstName: parsed.data.firstName,
          subject: parsed.data.subject,
          submissionId: contact._id.toString(),
        });
      } catch {
        // The message is already safely stored. Do not make users resubmit it
        // (and create duplicates) when the email provider is temporarily down.
        console.error("Unable to send contact auto-reply.");
      }

      return res.status(201).json({
        message: "Contact message saved successfully",
        success: true,
      });
    } catch {
      return res
        .status(500)
        .json({ message: "Unable to save contact message", success: false });
    }
  };
}
