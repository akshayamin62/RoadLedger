import type { Request, Response } from "express";
import { ActivityLog } from "../models/ActivityLog";
import { paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { endOfDay, startOfDay } from "../utils/dates";
import { escapeRegex, parsePagination } from "../utils/pagination";
import { serializeActivity } from "../utils/serialize";

export const listHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const query = req.query as Record<string, string | undefined>;
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { userId };

  if (query.module) filter.module = query.module;
  if (query.action) filter.action = query.action;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ description: regex }, { performedBy: regex }, { relatedRecordId: regex }];
  }
  if (query.fromDate || query.toDate) {
    filter.createdAt = {
      ...(query.fromDate ? { $gte: startOfDay(new Date(query.fromDate)) } : {}),
      ...(query.toDate ? { $lte: endOfDay(new Date(query.toDate)) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  return paginated(res, items.map(serializeActivity), { page, limit, total });
});
