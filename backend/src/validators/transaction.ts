import { z } from "zod";
import { COMPANIES } from "../models/Party.js";
import { PAYMENT_MODES, PAYMENT_STATUSES } from "../models/Transaction.js";
import { objectIdSchema, optionalRupeeAmountSchema, rupeeAmountSchema } from "./common.js";

export const paymentInputSchema = z.object({
  amount: rupeeAmountSchema,
  receivedDate: z.coerce.date(),
  paymentMode: z.enum(PAYMENT_MODES),
});

export const createTransactionSchema = z
  .object({
    vehicleId: objectIdSchema,
    partyId: objectIdSchema,
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    billNumber: z.string().trim().min(1).max(40),
    billAmount: rupeeAmountSchema,
    paymentReceivedDate: z.coerce.date().optional(),
    paymentReceivedAmount: optionalRupeeAmountSchema.optional().default(0),
    paymentMode: z.enum(PAYMENT_MODES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.toDate < data.fromDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "To Date cannot be earlier than From Date",
      });
    }
    const received = data.paymentReceivedAmount ?? 0;
    if (received > 0) {
      if (!data.paymentReceivedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentReceivedDate"],
          message: "Payment received date is required when a payment is recorded",
        });
      }
      if (!data.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Payment mode is required when a payment amount is greater than zero",
        });
      }
      if (received > data.billAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentReceivedAmount"],
          message: "Payment cannot exceed bill amount",
        });
      }
    }
  });

export const updateTransactionSchema = z
  .object({
    vehicleId: objectIdSchema.optional(),
    partyId: objectIdSchema.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    billNumber: z.string().trim().min(1).max(40).optional(),
    billAmount: rupeeAmountSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "To Date cannot be earlier than From Date",
      });
    }
  });

export const transactionQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: objectIdSchema.optional(),
  partyId: objectIdSchema.optional(),
  company: z.enum(COMPANIES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sort: z.enum(["newest", "oldest", "bill_high", "bill_low"]).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const analyticsQuerySchema = z.object({
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
});
