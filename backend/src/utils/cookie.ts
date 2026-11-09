import type { CookieOptions, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthPayload } from "../middleware/auth.js";

export function cookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}

export function setAuthCookie(res: Response, payload: AuthPayload) {
  res.cookie(env.cookieName, signToken(payload), cookieOptions());
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.cookieName, { ...cookieOptions(), maxAge: 0 });
}
