import { Router } from "express";

import { createContactController } from "../controllers/contactController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";
import type { AutoReplyEmailService } from "../services/autoReplyEmail.js";
import type { EmailDomainValidator } from "../services/emailDomainValidation.js";

export function createContactRouter(
  emailService: AutoReplyEmailService,
  emailDomainValidator: EmailDomainValidator,
) {
  const contactRouter = Router();

  contactRouter.post(
    "/",
    verifyTurnstile("contact"),
    createContactController(emailService, emailDomainValidator),
  );

  return contactRouter;
}
