import type { Response } from "express";

export function success<T>(res: Response, data: T, status = 200, message = "OK") {
  return res.status(status).json({ success: true, message, data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number },
  message = "OK",
) {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      ...meta,
      totalPages: Math.max(1, Math.ceil(meta.total / meta.limit)),
    },
  });
}
