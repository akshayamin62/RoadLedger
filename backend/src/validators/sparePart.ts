import { z } from "zod";
import { rupeeAmountSchema } from "./common.js";

export const sparePartBodySchema = z.object({
  partName: z.string().trim().min(2).max(120),
  providerName: z.string().trim().min(2).max(120),
  purchaseDate: z.coerce.date(),
  amount: rupeeAmountSchema,
});

export const sparePartQuerySchema = z.object({
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_high", "amount_low"]).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
