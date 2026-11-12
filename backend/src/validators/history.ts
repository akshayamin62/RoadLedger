import { z } from "zod";
import { ACTIVITY_ACTIONS, ACTIVITY_MODULES } from "../models/ActivityLog";

export const historyQuerySchema = z.object({
  search: z.string().optional(),
  module: z.enum(ACTIVITY_MODULES).optional(),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
