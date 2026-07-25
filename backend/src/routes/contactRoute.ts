import { Router } from "express";

import { createContact } from"../controllers/contactController.js";

const contactRouter = Router();

contactRouter.post("/", createContact);

export default contactRouter;