import type { Request, Response } from "express";

import type { PreSignupWorkflow } from "../services/preSignupWorkflow.js";
import type { ResendWebhookVerifier } from "../services/resendWebhook.js";

export function createResendWebhookController(
  verifier: ResendWebhookVerifier,
  workflow: PreSignupWorkflow,
) {
  return async function receiveResendWebhook(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const eventId = req.get("svix-id");
    const timestamp = req.get("svix-timestamp");
    const signature = req.get("svix-signature");

    if (
      !Buffer.isBuffer(req.body) ||
      !eventId ||
      !timestamp ||
      !signature
    ) {
      return res.status(400).json({ success: false, message: "Invalid webhook." });
    }

    let event;

    try {
      event = verifier.verify(req.body.toString("utf8"), {
        id: eventId,
        signature,
        timestamp,
      });
    } catch {
      return res.status(400).json({ success: false, message: "Invalid webhook." });
    }

    try {
      await workflow.handleWebhook(eventId, event);
      return res.status(200).json({ received: true });
    } catch {
      // A retryable status asks Resend to deliver the verified event again.
      return res.status(503).json({
        success: false,
        message: "Webhook processing is temporarily unavailable.",
      });
    }
  };
}
