import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { UnauthorizedError } from "../utils/httpError";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];
  if (!token) {
    return next(new UnauthorizedError("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.auth = { userId: payload.userId, email: payload.email };
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired session"));
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const user = await User.findById(req.auth.userId);
    if (!user) throw new UnauthorizedError("User no longer exists");
    next();
  } catch (error) {
    next(error);
  }
}
