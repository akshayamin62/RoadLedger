import { z } from "zod";
import { PAYMENT_MODES, PAYMENT_STATUSES } from "../models/Transaction";
import { optionalRupeeAmountSchema, rupeeAmountSchema } from "./common";

export const sparePartBodySchema = z
  .object({
    partName: z.string().trim().min(2).max(120),
    providerName: z.string().trim().min(1).max(120),
    purchaseDate: z.coerce.date(),
    amount: rupeeAmountSchema,
    paymentReceivedDate: z.coerce.date().optional(),
    paymentReceivedAmount: optionalRupeeAmountSchema.optional().default(0),
    paymentMode: z.enum(PAYMENT_MODES).optional(),
  })
  .superRefine((data, ctx) => {
    const received = data.paymentReceivedAmount ?? 0;
    if (received > 0) {
      if (!data.paymentReceivedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentReceivedDate"],
          message: "Payment date is required when a payment is recorded",
        });
      }
      if (!data.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Payment mode is required when a payment amount is greater than zero",
        });
      }
      if (received > data.amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentReceivedAmount"],
          message: "Payment cannot exceed bill amount",
        });
      }
    }
  });

export const updateSparePartSchema = z.object({
  partName: z.string().trim().min(2).max(120),
  providerName: z.string().trim().min(1).max(120),
  purchaseDate: z.coerce.date(),
  amount: rupeeAmountSchema,
});

export const sparePartQuerySchema = z.object({
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_high", "amount_low"]).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
