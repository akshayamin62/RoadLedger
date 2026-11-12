import type { Request, Response } from "express";
import mongoose from "mongoose";
import { SparePart } from "../models/SparePart";
import type { PaymentMode } from "../models/Transaction";
import { logActivity } from "../services/activity.service";
import { applySparePaymentTotals, emptyPaymentModeBreakdown } from "../services/payment.service";
import { success } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { endOfDay, monthKey, startOfDay } from "../utils/dates";
import { BadRequestError, NotFoundError } from "../utils/httpError";
import { rupeesToPaise } from "../utils/money";
import { escapeRegex, parsePagination } from "../utils/pagination";
import { serializeSparePart } from "../utils/serialize";

export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const {
    partName,
    providerName,
    purchaseDate,
    amount,
    paymentReceivedDate,
    paymentReceivedAmount,
    paymentMode,
  } = req.body as {
    partName: string;
    providerName: string;
    purchaseDate: Date;
    amount: number;
    paymentReceivedDate?: Date;
    paymentReceivedAmount?: number;
    paymentMode?: PaymentMode;
  };

  const amountPaise = rupeesToPaise(amount);
  const initialPaymentPaise = rupeesToPaise(paymentReceivedAmount ?? 0);
  const payments =
    initialPaymentPaise > 0 && paymentReceivedDate && paymentMode
      ? [
          {
            amountPaise: initialPaymentPaise,
            receivedDate: paymentReceivedDate,
            paymentMode,
            createdAt: new Date(),
          },
        ]
      : [];

  const part = await SparePart.create({
    userId,
    partName,
    providerName,
    purchaseDate,
    amountPaise,
    payments,
    totalPaidPaise: 0,
    pendingAmountPaise: amountPaise,
    paymentStatus: "PENDING",
  });
  applySparePaymentTotals(part);
  await part.save();

  await logActivity({
    userId,
    action: "CREATED",
    module: "SPARE_PART",
    description: `Added spare part ${partName} from ${providerName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
  if (payments.length) {
    await logActivity({
      userId,
      action: "PAYMENT_MADE",
      module: "SPARE_PART",
      description: `Paid ₹${(initialPaymentPaise / 100).toFixed(2)} for ${partName} (${providerName})`,
      relatedRecordId: part.id,
      performedBy: req.auth!.email,
    });
  }
  return success(res, serializeSparePart(part), 201, "Spare part added");
});

export const listSpareParts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const query = req.query as Record<string, string | undefined>;
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ partName: regex }, { providerName: regex }];
  }
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.fromDate || query.toDate) {
    filter.purchaseDate = {
      ...(query.fromDate ? { $gte: startOfDay(new Date(query.fromDate)) } : {}),
      ...(query.toDate ? { $lte: endOfDay(new Date(query.toDate)) } : {}),
    };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    date_desc: { purchaseDate: -1 },
    date_asc: { purchaseDate: 1 },
    amount_high: { amountPaise: -1 },
    amount_low: { amountPaise: 1 },
  };
  const sort = sortMap[query.sort ?? "date_desc"] ?? { purchaseDate: -1 };

  const paidExpression = {
    $reduce: {
      input: { $ifNull: ["$payments", []] },
      initialValue: 0,
      in: { $add: ["$$value", "$$this.amountPaise"] },
    },
  };

  const [items, total, totals] = await Promise.all([
    SparePart.find(filter).sort(sort).skip(skip).limit(limit),
    SparePart.countDocuments(filter),
    SparePart.aggregate([
      { $match: filter },
      { $addFields: { computedPaidPaise: paidExpression } },
      {
        $group: {
          _id: null,
          totalPaise: { $sum: "$amountPaise" },
          totalPaidPaise: { $sum: "$computedPaidPaise" },
          totalPendingPaise: {
            $sum: { $subtract: ["$amountPaise", "$computedPaidPaise"] },
          },
        },
      },
    ]),
  ]);

  const monthly = await SparePart.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
        totalPaise: { $sum: "$amountPaise" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const paidByMode = await SparePart.aggregate([
    { $match: filter },
    { $unwind: { path: "$payments", preserveNullAndEmptyArrays: false } },
    { $group: { _id: "$payments.paymentMode", totalPaise: { $sum: "$payments.amountPaise" } } },
  ]);
  const paymentModeBreakdown = emptyPaymentModeBreakdown();
  for (const row of paidByMode) {
    if (row._id in paymentModeBreakdown) {
      paymentModeBreakdown[row._id as PaymentMode] = row.totalPaise / 100;
    }
  }

  const monthlyPaid = await SparePart.aggregate([
    { $match: filter },
    { $unwind: { path: "$payments", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { year: { $year: "$payments.receivedDate" }, month: { $month: "$payments.receivedDate" } },
        totalPaise: { $sum: "$payments.amountPaise" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return res.status(200).json({
    success: true,
    message: "OK",
    data: items.map(serializeSparePart),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary: {
      totalExpenditure: (totals[0]?.totalPaise ?? 0) / 100,
      totalPaid: (totals[0]?.totalPaidPaise ?? 0) / 100,
      totalPending: (totals[0]?.totalPendingPaise ?? 0) / 100,
      totalRecords: total,
      monthlyExpenditure: monthly.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
        monthKey: monthKey(new Date(row._id.year, row._id.month - 1, 1)),
      })),
      monthlyPaid: monthlyPaid.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
      })),
      paymentModeBreakdown,
    },
  });
});

export const getSparePart = asyncHandler(async (req: Request, res: Response) => {
  const part = await SparePart.findOne({ _id: req.params.id, userId: req.auth!.userId });
  if (!part) throw new NotFoundError("Spare part record not found");
  return success(res, serializeSparePart(part));
});

export const updateSparePart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const part = await SparePart.findOne({ _id: req.params.id, userId });
  if (!part) throw new NotFoundError("Spare part record not found");
  const { partName, providerName, purchaseDate, amount } = req.body as {
    partName: string;
    providerName: string;
    purchaseDate: Date;
    amount: number;
  };
  const amountPaise = rupeesToPaise(amount);
  if (amountPaise < (part.totalPaidPaise ?? 0)) {
    throw new BadRequestError("Bill amount cannot be less than amount already paid");
  }
  part.partName = partName;
  part.providerName = providerName;
  part.purchaseDate = purchaseDate;
  part.amountPaise = amountPaise;
  applySparePaymentTotals(part);
  await part.save();
  await logActivity({
    userId,
    action: "UPDATED",
    module: "SPARE_PART",
    description: `Updated spare part ${partName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeSparePart(part), 200, "Spare part updated");
});

export const deleteSparePart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const part = await SparePart.findOne({ _id: req.params.id, userId });
  if (!part) throw new NotFoundError("Spare part record not found");
  await part.deleteOne();
  await logActivity({
    userId,
    action: "DELETED",
    module: "SPARE_PART",
    description: `Deleted spare part ${part.partName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
  return success(res, null, 200, "Spare part deleted");
});

export const addSparePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { amount, receivedDate, paymentMode } = req.body as {
    amount: number;
    receivedDate: Date;
    paymentMode: PaymentMode;
  };
  const part = await SparePart.findOne({ _id: req.params.id, userId });
  if (!part) throw new NotFoundError("Spare part record not found");
  const amountPaise = rupeesToPaise(amount);
  if ((part.totalPaidPaise ?? 0) + amountPaise > part.amountPaise) {
    throw new BadRequestError("Total payments cannot exceed bill amount");
  }
  part.payments.push({
    amountPaise,
    receivedDate,
    paymentMode,
    createdAt: new Date(),
  });
  applySparePaymentTotals(part);
  await part.save();
  await logActivity({
    userId,
    action: "PAYMENT_MADE",
    module: "SPARE_PART",
    description: `Paid ₹${amount.toFixed(2)} (${paymentMode}) for ${part.partName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeSparePart(part), 201, "Payment recorded");
});

export const updateSparePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { amount, receivedDate, paymentMode } = req.body as {
    amount: number;
    receivedDate: Date;
    paymentMode: PaymentMode;
  };
  const part = await SparePart.findOne({ _id: req.params.id, userId });
  if (!part) throw new NotFoundError("Spare part record not found");
  const payment = part.payments.find((entry) => entry._id?.toString() === req.params.paymentId);
  if (!payment) throw new NotFoundError("Payment not found");

  const amountPaise = rupeesToPaise(amount);
  const others = part.payments
    .filter((entry) => entry._id?.toString() !== req.params.paymentId)
    .reduce((sum, entry) => sum + entry.amountPaise, 0);
  if (others + amountPaise > part.amountPaise) {
    throw new BadRequestError("Total payments cannot exceed bill amount");
  }

  payment.amountPaise = amountPaise;
  payment.receivedDate = receivedDate;
  payment.paymentMode = paymentMode;
  applySparePaymentTotals(part);
  await part.save();
  await logActivity({
    userId,
    action: "UPDATED",
    module: "SPARE_PART",
    description: `Updated payment of ₹${amount.toFixed(2)} for ${part.partName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeSparePart(part), 200, "Payment updated");
});
