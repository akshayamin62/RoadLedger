import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "Route not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: err.flatten(),
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (typeof err === "object" && err && "code" in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate record already exists" });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({
    success: false,
    message: env.nodeEnv === "production" ? "Internal server error" : message,
  });
}
