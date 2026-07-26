import { Router } from "express";

import { createContact } from "../controllers/contactController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";

const contactRouter = Router();

contactRouter.post("/", verifyTurnstile("contact"), createContact);

export default contactRouter;
