import { Router } from "express";

import { createPreSignup } from "../controllers/preSignupController.js";
import { verifyTurnstile } from "../middleware/verifyTurnstile.js";

const preSignupRouter = Router();

preSignupRouter.post("/", verifyTurnstile("pre_signup"), createPreSignup);

export default preSignupRouter;
