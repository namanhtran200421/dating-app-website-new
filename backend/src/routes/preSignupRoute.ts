import { Router } from "express";

import {
  createPreSignupController,
  createUnsubscribeController,
  createVerificationController,
  createVerificationResendController,
} from "../controllers/preSignupController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";
import type { PreSignupWorkflow } from "../services/preSignupWorkflow.js";

export function createPreSignupRouter(workflow: PreSignupWorkflow) {
  const preSignupRouter = Router();

  preSignupRouter.post(
    "/",
    verifyTurnstile("pre_signup"),
    createPreSignupController(workflow),
  );
  preSignupRouter.post(
    "/resend",
    verifyTurnstile("pre_signup_resend"),
    createVerificationResendController(workflow),
  );
  preSignupRouter.post("/verify", createVerificationController(workflow));
  preSignupRouter.post("/unsubscribe", createUnsubscribeController(workflow));

  return preSignupRouter;
}
