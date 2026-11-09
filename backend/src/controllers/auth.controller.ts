import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { logActivity } from "../services/activity.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";
import { clearAuthCookie, setAuthCookie } from "../utils/cookie.js";
import { ConflictError, UnauthorizedError } from "../utils/httpError.js";
import { serializeUser } from "../utils/serialize.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await User.create({ name, email, passwordHash, role: "ADMIN" });

  setAuthCookie(res, { userId: user.id, email: user.email });
  await logActivity({
    userId: user.id,
    action: "LOGIN",
    module: "AUTH",
    description: "Account created and signed in",
    relatedRecordId: user.id,
    performedBy: user.email,
  });

  return success(res, serializeUser(user), 201, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email });
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  setAuthCookie(res, { userId: user.id, email: user.email });
  await logActivity({
    userId: user.id,
    action: "LOGIN",
    module: "AUTH",
    description: "User signed in",
    relatedRecordId: user.id,
    performedBy: user.email,
  });

  return success(res, serializeUser(user), 200, "Signed in");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth) {
    await logActivity({
      userId: req.auth.userId,
      action: "LOGOUT",
      module: "AUTH",
      description: "User signed out",
      relatedRecordId: req.auth.userId,
      performedBy: req.auth.email,
    });
  }
  clearAuthCookie(res);
  return success(res, null, 200, "Signed out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth!.userId);
  if (!user) throw new UnauthorizedError("User no longer exists");
  return success(res, serializeUser(user));
});
