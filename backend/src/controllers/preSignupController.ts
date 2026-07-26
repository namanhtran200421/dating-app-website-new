import type { Request, Response } from "express";
import { PreSignSchema } from "../models/subscripeModel.js";
import { preSignupInputSchema } from "../validation/emailSchema.js";
import { sendValidationError } from "../validation/validationResponse.js";

export async function createPreSignup(req: Request, res: Response): Promise<Response> {
  res.setHeader("Cache-Control", "no-store");
  const parsed = preSignupInputSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendValidationError(res, parsed.error);
  }
  const { email } = parsed.data;

  try {
    const existingPreSignup = await PreSignSchema.findOne({ email });

    if (existingPreSignup) {
      return res.status(400).json({
        success: false,
        message: "This email has already been registered",
      });
    }

    await PreSignSchema.create({
      email,
    });

    return res.status(201).json({
      message: "Email registered successful",
      success: true,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      message: "Unable to register email.",
    });
  }
}
