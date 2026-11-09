import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Party } from "../models/Party.js";
import { Counter, nextSequence } from "../models/Counter.js";
import { Transaction, type PaymentMode } from "../models/Transaction.js";
import { Vehicle } from "../models/Vehicle.js";
import { logActivity } from "../services/activity.service.js";
import { applyPaymentTotals, emptyPaymentModeBreakdown } from "../services/payment.service.js";
import { paginated, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { endOfDay, monthKey, startOfDay } from "../utils/dates.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/httpError.js";
import { rupeesToPaise } from "../utils/money.js";
import { escapeRegex, parsePagination } from "../utils/pagination.js";
import { serializeTransaction } from "../utils/serialize.js";

async function assertOwnedVehicle(userId: string, vehicleId: string) {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
  if (!vehicle) throw new BadRequestError("Selected vehicle is invalid");
  return vehicle;
}

async function assertOwnedParty(userId: string, partyId: string) {
  const party = await Party.findOne({ _id: partyId, userId });
  if (!party) throw new BadRequestError("Selected party is invalid");
  return party;
}

function populateTx() {
  return [
    { path: "vehicleId", select: "vehicleType registrationNumber createdAt updatedAt" },
    { path: "partyId", select: "name gstNumber company createdAt updatedAt" },
  ];
}

export const nextSerial = asyncHandler(async (req: Request, res: Response) => {
  const counter = await Counter.findOne({ key: `transaction:${req.auth!.userId}` });
  return success(res, { serialNumber: (counter?.seq ?? 0) + 1 });
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const body = req.body as {
    vehicleId: string;
    partyId: string;
    fromDate: Date;
    toDate: Date;
    billNumber: string;
    billAmount: number;
    paymentReceivedDate?: Date;
    paymentReceivedAmount?: number;
    paymentMode?: PaymentMode;
  };

  await assertOwnedVehicle(userId, body.vehicleId);
  await assertOwnedParty(userId, body.partyId);

  const duplicateBill = await Transaction.findOne({ userId, billNumber: body.billNumber });
  if (duplicateBill) throw new ConflictError("Bill number already exists");

  const billAmountPaise = rupeesToPaise(body.billAmount);
  const initialPaymentPaise = rupeesToPaise(body.paymentReceivedAmount ?? 0);

  const serialNumber = await nextSequence(`transaction:${userId}`);
  const payments =
    initialPaymentPaise > 0 && body.paymentReceivedDate && body.paymentMode
      ? [
          {
            amountPaise: initialPaymentPaise,
            receivedDate: body.paymentReceivedDate,
            paymentMode: body.paymentMode,
            createdAt: new Date(),
          },
        ]
      : [];

  const tx = await Transaction.create({
    userId,
    serialNumber,
    vehicleId: body.vehicleId,
    partyId: body.partyId,
    fromDate: body.fromDate,
    toDate: body.toDate,
    billNumber: body.billNumber,
    billAmountPaise,
    payments,
    totalReceivedPaise: 0,
    pendingAmountPaise: billAmountPaise,
    paymentStatus: "PENDING",
  });

  applyPaymentTotals(tx);
  await tx.save();
  await tx.populate(populateTx());
  await logActivity({
    userId,
    action: "CREATED",
    module: "TRANSACTION",
    description: `Created transaction #${serialNumber} for bill ${body.billNumber}`,
    relatedRecordId: tx.id,
    performedBy: req.auth!.email,
  });
  if (payments.length) {
    await logActivity({
      userId,
      action: "PAYMENT_RECEIVED",
      module: "PAYMENT",
      description: `Received ₹${(initialPaymentPaise / 100).toFixed(2)} for bill ${body.billNumber}`,
      relatedRecordId: tx.id,
      performedBy: req.auth!.email,
    });
  }
  return success(res, serializeTransaction(tx), 201, "Transaction created");
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const query = req.query as Record<string, string | undefined>;
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { userId };

  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.partyId) filter.partyId = query.partyId;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.fromDate || query.toDate) {
    const from = query.fromDate ? startOfDay(new Date(query.fromDate)) : undefined;
    const to = query.toDate ? endOfDay(new Date(query.toDate)) : undefined;
    filter.$and = [
      ...(from ? [{ toDate: { $gte: from } }] : []),
      ...(to ? [{ fromDate: { $lte: to } }] : []),
    ];
  }

  if (query.company) {
    const parties = await Party.find({ userId, company: query.company }).select("_id");
    filter.partyId = { $in: parties.map((p) => p._id) };
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    const [vehicles, parties] = await Promise.all([
      Vehicle.find({ userId, registrationNumber: regex }).select("_id"),
      Party.find({ userId, name: regex }).select("_id"),
    ]);
    const numeric = Number(query.search);
    filter.$or = [
      { billNumber: regex },
      ...(Number.isInteger(numeric) ? [{ serialNumber: numeric }] : []),
      { vehicleId: { $in: vehicles.map((v) => v._id) } },
      { partyId: { $in: parties.map((p) => p._id) } },
    ];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    bill_high: { billAmountPaise: -1 },
    bill_low: { billAmountPaise: 1 },
  };
  const sort = sortMap[query.sort ?? "newest"] ?? { createdAt: -1 };

  const [items, total] = await Promise.all([
    Transaction.find(filter).populate(populateTx()).sort(sort).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);
  return paginated(res, items.map(serializeTransaction), { page, limit, total });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.auth!.userId }).populate(
    populateTx(),
  );
  if (!tx) throw new NotFoundError("Transaction not found");
  return success(res, serializeTransaction(tx));
});

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const tx = await Transaction.findOne({ _id: req.params.id, userId });
  if (!tx) throw new NotFoundError("Transaction not found");

  const body = req.body as {
    vehicleId?: string;
    partyId?: string;
    fromDate?: Date;
    toDate?: Date;
    billNumber?: string;
    billAmount?: number;
  };

  if (body.vehicleId) await assertOwnedVehicle(userId, body.vehicleId);
  if (body.partyId) await assertOwnedParty(userId, body.partyId);
  if (body.billNumber && body.billNumber !== tx.billNumber) {
    const duplicate = await Transaction.findOne({
      userId,
      billNumber: body.billNumber,
      _id: { $ne: tx._id },
    });
    if (duplicate) throw new ConflictError("Bill number already exists");
    tx.billNumber = body.billNumber;
  }

  if (body.vehicleId) tx.vehicleId = new mongoose.Types.ObjectId(body.vehicleId);
  if (body.partyId) tx.partyId = new mongoose.Types.ObjectId(body.partyId);
  if (body.fromDate) tx.fromDate = body.fromDate;
  if (body.toDate) tx.toDate = body.toDate;
  if (tx.toDate < tx.fromDate) throw new BadRequestError("To Date cannot be earlier than From Date");

  if (body.billAmount !== undefined) {
    const billAmountPaise = rupeesToPaise(body.billAmount);
    if (billAmountPaise < tx.totalReceivedPaise) {
      throw new BadRequestError("Bill amount cannot be less than amount already received");
    }
    tx.billAmountPaise = billAmountPaise;
    applyPaymentTotals(tx);
  }

  await tx.save();
  await tx.populate(populateTx());
  await logActivity({
    userId,
    action: "UPDATED",
    module: "TRANSACTION",
    description: `Updated transaction #${tx.serialNumber}`,
    relatedRecordId: tx.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeTransaction(tx), 200, "Transaction updated");
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const tx = await Transaction.findOne({ _id: req.params.id, userId });
  if (!tx) throw new NotFoundError("Transaction not found");
  await tx.deleteOne();
  await logActivity({
    userId,
    action: "DELETED",
    module: "TRANSACTION",
    description: `Deleted transaction #${tx.serialNumber} (${tx.billNumber})`,
    relatedRecordId: tx.id,
    performedBy: req.auth!.email,
  });
  return success(res, null, 200, "Transaction deleted");
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { amount, receivedDate, paymentMode } = req.body as {
    amount: number;
    receivedDate: Date;
    paymentMode: PaymentMode;
  };

  const tx = await Transaction.findOne({ _id: req.params.id, userId });
  if (!tx) throw new NotFoundError("Transaction not found");

  const amountPaise = rupeesToPaise(amount);
  if (tx.totalReceivedPaise + amountPaise > tx.billAmountPaise) {
    throw new BadRequestError("Total payments cannot exceed bill amount");
  }

  tx.payments.push({
    amountPaise,
    receivedDate,
    paymentMode,
    createdAt: new Date(),
  });
  applyPaymentTotals(tx);
  await tx.save();
  await tx.populate(populateTx());

  await logActivity({
    userId,
    action: "PAYMENT_RECEIVED",
    module: "PAYMENT",
    description: `Received ₹${amount.toFixed(2)} (${paymentMode}) for bill ${tx.billNumber}`,
    relatedRecordId: tx.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeTransaction(tx), 201, "Payment recorded");
});

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { amount, receivedDate, paymentMode } = req.body as {
    amount: number;
    receivedDate: Date;
    paymentMode: PaymentMode;
  };

  const tx = await Transaction.findOne({ _id: req.params.id, userId });
  if (!tx) throw new NotFoundError("Transaction not found");
  const payment = tx.payments.find((entry) => entry._id?.toString() === req.params.paymentId);
  if (!payment) throw new NotFoundError("Payment not found");

  const amountPaise = rupeesToPaise(amount);
  const others = tx.payments
    .filter((entry) => entry._id?.toString() !== req.params.paymentId)
    .reduce((sum, entry) => sum + entry.amountPaise, 0);
  if (others + amountPaise > tx.billAmountPaise) {
    throw new BadRequestError("Total payments cannot exceed bill amount");
  }

  payment.amountPaise = amountPaise;
  payment.receivedDate = receivedDate;
  payment.paymentMode = paymentMode;
  applyPaymentTotals(tx);
  await tx.save();
  await tx.populate(populateTx());

  await logActivity({
    userId,
    action: "UPDATED",
    module: "PAYMENT",
    description: `Updated payment of ₹${amount.toFixed(2)} (${paymentMode}) for bill ${tx.billNumber}`,
    relatedRecordId: tx.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeTransaction(tx), 200, "Payment updated");
});

export const transactionAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const from = startOfDay(new Date(String(req.query.fromDate)));
  const to = endOfDay(new Date(String(req.query.toDate)));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestError("Invalid date range");
  }
  if (to < from) throw new BadRequestError("To Date cannot be earlier than From Date");

  const overlapping = await Transaction.find({
    userId,
    fromDate: { $lte: to },
    toDate: { $gte: from },
  }).populate(populateTx());

  const totalBillPaise = overlapping.reduce((sum, tx) => sum + tx.billAmountPaise, 0);
  const totalPendingPaise = overlapping.reduce((sum, tx) => sum + tx.pendingAmountPaise, 0);

  const collectionAgg = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$payments" },
    { $match: { "payments.receivedDate": { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$payments.paymentMode",
        totalPaise: { $sum: "$payments.amountPaise" },
      },
    },
  ]);

  const totalReceivedPaise = collectionAgg.reduce((sum, row) => sum + row.totalPaise, 0);
  const paymentModeBreakdown = emptyPaymentModeBreakdown();
  for (const row of collectionAgg) {
    if (row._id in paymentModeBreakdown) {
      paymentModeBreakdown[row._id as PaymentMode] = row.totalPaise / 100;
    }
  }

  const monthlyBillingMap = new Map<string, number>();
  for (const tx of overlapping) {
    const key = monthKey(tx.fromDate);
    monthlyBillingMap.set(key, (monthlyBillingMap.get(key) ?? 0) + tx.billAmountPaise);
  }

  const monthlyCollectionAgg = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$payments" },
    { $match: { "payments.receivedDate": { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          year: { $year: "$payments.receivedDate" },
          month: { $month: "$payments.receivedDate" },
        },
        totalPaise: { $sum: "$payments.amountPaise" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const partyMap = new Map<string, { name: string; company: string; billPaise: number }>();
  const vehicleMap = new Map<string, { registrationNumber: string; vehicleType: string; billPaise: number }>();
  const companyMap = { JAY_ROADWAYS: 0, JAY_INFRA: 0 };

  for (const tx of overlapping) {
    const party = tx.partyId as unknown as { id: string; name: string; company: "JAY_ROADWAYS" | "JAY_INFRA" };
    const vehicle = tx.vehicleId as unknown as {
      id: string;
      registrationNumber: string;
      vehicleType: string;
    };
    const existingParty = partyMap.get(party.id) ?? {
      name: party.name,
      company: party.company,
      billPaise: 0,
    };
    existingParty.billPaise += tx.billAmountPaise;
    partyMap.set(party.id, existingParty);

    const existingVehicle = vehicleMap.get(vehicle.id) ?? {
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      billPaise: 0,
    };
    existingVehicle.billPaise += tx.billAmountPaise;
    vehicleMap.set(vehicle.id, existingVehicle);

    companyMap[party.company] += tx.billAmountPaise;
  }

  return success(res, {
    range: { fromDate: from, toDate: to },
    summary: {
      totalBillAmount: totalBillPaise / 100,
      totalAmountReceived: totalReceivedPaise / 100,
      totalPendingAmount: totalPendingPaise / 100,
      totalTransactions: overlapping.length,
    },
    notes: {
      totalBillAmount: "Sum of bill amounts for transactions whose period overlaps the selected range.",
      totalAmountReceived: "Sum of payments whose received date falls within the selected range.",
      totalPendingAmount: "Current outstanding balance of overlapping transactions.",
    },
    charts: {
      monthlyBilling: [...monthlyBillingMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, paise]) => ({ month, amount: paise / 100 })),
      monthlyCollection: monthlyCollectionAgg.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
      })),
      paymentModeBreakdown,
    },
    partyWise: [...partyMap.entries()].map(([id, value]) => ({
      partyId: id,
      name: value.name,
      company: value.company,
      billAmount: value.billPaise / 100,
    })),
    vehicleWise: [...vehicleMap.entries()].map(([id, value]) => ({
      vehicleId: id,
      registrationNumber: value.registrationNumber,
      vehicleType: value.vehicleType,
      billAmount: value.billPaise / 100,
    })),
    companyWise: {
      JAY_ROADWAYS: companyMap.JAY_ROADWAYS / 100,
      JAY_INFRA: companyMap.JAY_INFRA / 100,
    },
  });
});
