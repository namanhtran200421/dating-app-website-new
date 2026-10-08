import { Router } from "express";

import { createPreSignupController } from "../controllers/preSignupController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";
import type { AutoReplyEmailService } from "../services/autoReplyEmail.js";

export function createPreSignupRouter(emailService: AutoReplyEmailService) {
  const preSignupRouter = Router();

  preSignupRouter.post(
    "/",
    verifyTurnstile("pre_signup"),
    createPreSignupController(emailService),
  );

  return preSignupRouter;
}
