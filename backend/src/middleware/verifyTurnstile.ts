import type { NextFunction, Request, Response } from "express";

type TurnstileAction = "pre_signup" | "contact";

interface TurnstileVerification {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const TEST_SECRET = "1x0000000000000000000000000000000AA";

function rejectSecurityCheck(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.status(403).json({
    success: false,
    message: "Security check failed. Please refresh and try again.",
  });
}

export function verifyTurnstile(expectedAction: TurnstileAction) {
  return async function turnstileMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = req.body?.turnstileToken;

    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > MAX_TOKEN_LENGTH
    ) {
      rejectSecurityCheck(res);
      return;
    }

    const secret = process.env.TURNSTILE_SECRET?.trim();

    if (!secret) {
      console.error("TURNSTILE_SECRET is not configured.");
      res.status(503).json({
        success: false,
        message: "Security verification is temporarily unavailable.",
      });
      return;
    }

    try {
      const body = new URLSearchParams({
        secret,
        response: token,
      });
      const verificationResponse = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(8_000),
      });

      if (!verificationResponse.ok) {
        throw new Error(
          `Turnstile returned HTTP ${verificationResponse.status}.`,
        );
      }

      const verification =
        (await verificationResponse.json()) as TurnstileVerification;
      const usingLocalTestKey =
        process.env.NODE_ENV !== "production" && secret === TEST_SECRET;
      const expectedHostname =
        process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim() || "www.rosemarry.app";
      const hostnameMatches =
        usingLocalTestKey || verification.hostname === expectedHostname;
      const actionMatches =
        usingLocalTestKey || verification.action === expectedAction;

      if (!verification.success || !hostnameMatches || !actionMatches) {
        console.warn("Turnstile rejected a form submission.", {
          action: verification.action,
          errorCodes: verification["error-codes"],
          hostname: verification.hostname,
        });
        rejectSecurityCheck(res);
        return;
      }

      delete req.body.turnstileToken;
      next();
    } catch (error) {
      console.error("Turnstile verification request failed:", error);
      res.status(503).json({
        success: false,
        message: "Security verification is temporarily unavailable.",
      });
    }
  };
}
