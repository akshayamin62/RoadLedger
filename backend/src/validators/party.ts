import { z } from "zod";
import { COMPANIES } from "../models/Party.js";
import { optionalGstSchema } from "./common.js";

export const partyBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  gstNumber: optionalGstSchema.default(""),
  company: z.enum(COMPANIES),
});

export const partyQuerySchema = z.object({
  search: z.string().optional(),
  company: z.enum(COMPANIES).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
