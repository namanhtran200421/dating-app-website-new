import type { Request, Response } from "express";

import type { PreSignupWorkflow } from "../services/preSignupWorkflow.js";
import {
  EmailDomainTemporarilyUnavailableError,
  InvalidEmailDomainError,
  VerificationEmailUnavailableError,
} from "../services/preSignupWorkflow.js";
import {
  preSignupInputSchema,
  verificationTokenInputSchema,
} from "../validation/emailSchema.js";
import { sendValidationError } from "../validation/validationResponse.js";

const ACCEPTED_RESPONSE = {
  message:
    "If this address is eligible, a confirmation email will arrive shortly.",
  success: true,
};

function workflowErrorResponse(error: unknown, res: Response): Response {
  if (error instanceof InvalidEmailDomainError) {
    return res.status(400).json({
      success: false,
      message:
        error.reason === "disposable"
          ? "Please use a permanent email address."
          : "That email domain does not appear to receive mail.",
    });
  }

  if (
    error instanceof EmailDomainTemporarilyUnavailableError ||
    error instanceof VerificationEmailUnavailableError
  ) {
    return res.status(503).json({
      success: false,
      message: "Email verification is temporarily unavailable. Please try again.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to process the signup request.",
  });
}

export function createPreSignupController(workflow: PreSignupWorkflow) {
  return async function createPreSignup(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const parsed = preSignupInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      await workflow.submit(parsed.data.email);
      return res.status(202).json(ACCEPTED_RESPONSE);
    } catch (error) {
      return workflowErrorResponse(error, res);
    }
  };
}

export function createVerificationResendController(workflow: PreSignupWorkflow) {
  return async function resendVerification(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const parsed = preSignupInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      await workflow.requestResend(parsed.data.email);
      return res.status(202).json(ACCEPTED_RESPONSE);
    } catch (error) {
      return workflowErrorResponse(error, res);
    }
  };
}

export function createVerificationController(workflow: PreSignupWorkflow) {
  return async function confirmVerification(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const parsed = verificationTokenInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "This confirmation link is invalid or has expired.",
      });
    }

    try {
      const confirmation = await workflow.confirmVerification(parsed.data.token);
      return confirmation.verified
        ? res.status(200).json({
            success: true,
            message: "Your email is confirmed. You're on the early-access list.",
            receiptSent: confirmation.receiptSent,
          })
        : res.status(400).json({
            success: false,
            message: "This confirmation link is invalid or has expired.",
          });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Unable to confirm this email right now.",
      });
    }
  };
}

export function createUnsubscribeController(workflow: PreSignupWorkflow) {
  return async function unsubscribe(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const parsed = verificationTokenInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "This unsubscribe link is invalid.",
      });
    }

    try {
      const unsubscribed = await workflow.unsubscribe(parsed.data.token);
      return unsubscribed
        ? res.status(200).json({
            success: true,
            message: "This address has been unsubscribed.",
          })
        : res.status(400).json({
            success: false,
            message: "This unsubscribe link is invalid.",
          });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Unable to unsubscribe this address right now.",
      });
    }
  };
}
