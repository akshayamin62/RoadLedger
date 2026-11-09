import { z } from "zod";

export const dashboardQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
