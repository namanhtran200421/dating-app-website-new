import type { Request, Response } from "express";
import { retentionExpiry } from "../config/retention.js";
import { PreSignSchema } from "../models/subscripeModel.js";
import { preSignupInputSchema } from "../validation/emailSchema.js";
import { sendValidationError } from "../validation/validationResponse.js";

export async function createPreSignup(
  req: Request,
  res: Response,
): Promise<Response> {
  res.setHeader("Cache-Control", "no-store");
  const parsed = preSignupInputSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendValidationError(res, parsed.error);
  }
  const { email } = parsed.data;

  try {
    await PreSignSchema.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          expiresAt: retentionExpiry("PRE_SIGNUP_RETENTION_DAYS"),
        },
      },
      { upsert: true, runValidators: true },
    );

    return res.status(202).json({
      message: "Signup request accepted.",
      success: true,
    });
  } catch {
    return res.status(500).json({
      message: "Unable to register email.",
      success: false,
    });
  }
}
