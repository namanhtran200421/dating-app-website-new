import type { NextFunction, Request, Response } from "express";

function rejectRequest(
  res: Response,
  status: 403 | 415,
  message: string,
): void {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json({ success: false, message });
}

export function verifyFormRequest(allowedOrigins: ReadonlySet<string>) {
  return function formRequestMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (req.method !== "POST") {
      next();
      return;
    }

    const origin = req.get("origin");

    if (!origin || !allowedOrigins.has(origin)) {
      rejectRequest(res, 403, "Request origin is not allowed.");
      return;
    }

    if (!req.is("application/json")) {
      rejectRequest(res, 415, "Content-Type must be application/json.");
      return;
    }

    next();
  };
}
