import { Router } from "express";

import { createPreSignup } from"../controllers/preSignupController.js";

const preSignupRouter = Router();

preSignupRouter.post("/", createPreSignup);

export default preSignupRouter;