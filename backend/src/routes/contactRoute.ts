import { Router } from "express";

import { createContactController } from "../controllers/contactController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";
import type { AutoReplyEmailService } from "../services/autoReplyEmail.js";

export function createContactRouter(emailService: AutoReplyEmailService) {
  const contactRouter = Router();

  contactRouter.post(
    "/",
    verifyTurnstile("contact"),
    createContactController(emailService),
  );

  return contactRouter;
}
