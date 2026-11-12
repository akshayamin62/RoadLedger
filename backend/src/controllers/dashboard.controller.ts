import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Party } from "../models/Party";
import { SparePart } from "../models/SparePart";
import { Transaction } from "../models/Transaction";
import { Vehicle } from "../models/Vehicle";
import { success } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { endOfDay, monthKey, startOfDay } from "../utils/dates";
import { serializeSparePart, serializeTransaction } from "../utils/serialize";

function rangeFilter(query: Request["query"]) {
  const fromDate = query.fromDate ? startOfDay(new Date(String(query.fromDate))) : undefined;
  const toDate = query.toDate ? endOfDay(new Date(String(query.toDate))) : undefined;
  return { fromDate, toDate };
}

export const dashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { fromDate, toDate } = rangeFilter(req.query);
  const overlap: Record<string, unknown> = { userId };
  if (fromDate || toDate) {
    overlap.$and = [
      ...(fromDate ? [{ toDate: { $gte: fromDate } }] : []),
      ...(toDate ? [{ fromDate: { $lte: toDate } }] : []),
    ];
  }

  const paymentMatch: Record<string, unknown> = {};
  if (fromDate || toDate) {
    paymentMatch["payments.receivedDate"] = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
  }

  const spareFilter: Record<string, unknown> = { userId: userObjectId };
  if (fromDate || toDate) {
    spareFilter.purchaseDate = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
  }

  const [
    vehicleCount,
    partyCount,
    overlapping,
    spareRecords,
    spareTotals,
    sparePaidAgg,
    receivedAgg,
    recentTx,
    pendingTx,
    recentPayments,
    recentSpareParts,
    pendingSpareParts,
    recentSparePayments,
  ] = await Promise.all([
    Vehicle.countDocuments({ userId }),
    Party.countDocuments({ userId }),
    Transaction.find(overlap)
      .populate([
        { path: "vehicleId", select: "vehicleType registrationNumber createdAt updatedAt" },
        { path: "partyId", select: "name gstNumber company createdAt updatedAt" },
      ])
      .sort({ createdAt: -1 }),
    SparePart.find(spareFilter).sort({ purchaseDate: -1 }),
    SparePart.aggregate([
      { $match: spareFilter },
      {
        $addFields: {
          computedPaidPaise: {
            $reduce: {
              input: { $ifNull: ["$payments", []] },
              initialValue: 0,
              in: { $add: ["$$value", "$$this.amountPaise"] },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPaise: { $sum: "$amountPaise" },
          totalPendingPaise: {
            $sum: { $subtract: ["$amountPaise", "$computedPaidPaise"] },
          },
        },
      },
    ]),
    SparePart.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: "$payments" },
      ...(Object.keys(paymentMatch).length ? [{ $match: paymentMatch }] : []),
      { $group: { _id: null, totalPaise: { $sum: "$payments.amountPaise" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: "$payments" },
      ...(Object.keys(paymentMatch).length ? [{ $match: paymentMatch }] : []),
      { $group: { _id: null, totalPaise: { $sum: "$payments.amountPaise" } } },
    ]),
    Transaction.find({ userId })
      .populate([
        { path: "vehicleId", select: "vehicleType registrationNumber createdAt updatedAt" },
        { path: "partyId", select: "name gstNumber company createdAt updatedAt" },
      ])
      .sort({ createdAt: -1 })
      .limit(6),
    Transaction.find({ userId, paymentStatus: { $ne: "PAID" } })
      .populate([
        { path: "vehicleId", select: "vehicleType registrationNumber createdAt updatedAt" },
        { path: "partyId", select: "name gstNumber company createdAt updatedAt" },
      ])
      .sort({ pendingAmountPaise: -1 })
      .limit(6),
    Transaction.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: "$payments" },
      { $sort: { "payments.receivedDate": -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "parties",
          localField: "partyId",
          foreignField: "_id",
          as: "party",
        },
      },
      { $unwind: { path: "$party", preserveNullAndEmptyArrays: true } },
    ]),
    SparePart.find({ userId }).sort({ createdAt: -1 }).limit(6),
    SparePart.find({ userId, paymentStatus: { $ne: "PAID" } }).sort({ pendingAmountPaise: -1 }).limit(6),
    SparePart.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: "$payments" },
      { $sort: { "payments.receivedDate": -1 } },
      { $limit: 6 },
    ]),
  ]);

  const totalBillPaise = overlapping.reduce((sum, tx) => sum + tx.billAmountPaise, 0);
  const totalPendingPaise = overlapping.reduce((sum, tx) => sum + tx.pendingAmountPaise, 0);

  const vehicleSummaryMap = new Map<string, { registrationNumber: string; count: number; billPaise: number }>();
  for (const tx of overlapping) {
    const vehicle = tx.vehicleId as unknown as { id: string; registrationNumber: string };
    const current = vehicleSummaryMap.get(vehicle.id) ?? {
      registrationNumber: vehicle.registrationNumber,
      count: 0,
      billPaise: 0,
    };
    current.count += 1;
    current.billPaise += tx.billAmountPaise;
    vehicleSummaryMap.set(vehicle.id, current);
  }

  const providerMap = new Map<string, { count: number; billPaise: number; paidPaise: number }>();
  for (const part of spareRecords) {
    const paidPaise = (part.payments ?? []).reduce((sum, payment) => sum + payment.amountPaise, 0);
    const current = providerMap.get(part.providerName) ?? { count: 0, billPaise: 0, paidPaise: 0 };
    current.count += 1;
    current.billPaise += part.amountPaise;
    current.paidPaise += paidPaise;
    providerMap.set(part.providerName, current);
  }

  return success(res, {
    cards: {
      totalVehicles: vehicleCount,
      totalParties: partyCount,
      totalTransactions: overlapping.length,
      totalBillAmount: totalBillPaise / 100,
      totalAmountReceived: (receivedAgg[0]?.totalPaise ?? 0) / 100,
      totalPendingAmount: totalPendingPaise / 100,
      totalSparePartsExpenses: (spareTotals[0]?.totalPaise ?? 0) / 100,
      totalSparePartsPaid: (sparePaidAgg[0]?.totalPaise ?? 0) / 100,
      totalSparePartsPending: (spareTotals[0]?.totalPendingPaise ?? 0) / 100,
    },
    recentTransactions: recentTx.map(serializeTransaction),
    pendingPayments: pendingTx.map(serializeTransaction),
    recentCollections: recentPayments.map((row) => ({
      transactionId: row._id.toString(),
      serialNumber: row.serialNumber,
      billNumber: row.billNumber,
      partyName: row.party?.name ?? "Unknown",
      amount: row.payments.amountPaise / 100,
      receivedDate: row.payments.receivedDate,
      paymentMode: row.payments.paymentMode,
    })),
    vehicleWise: [...vehicleSummaryMap.entries()].map(([id, value]) => ({
      vehicleId: id,
      registrationNumber: value.registrationNumber,
      transactions: value.count,
      billAmount: value.billPaise / 100,
    })),
    recentSpareParts: recentSpareParts.map(serializeSparePart),
    pendingSparePayments: pendingSpareParts.map(serializeSparePart),
    recentSparePayments: recentSparePayments.map((row) => ({
      sparePartId: row._id.toString(),
      partName: row.partName,
      providerName: row.providerName,
      amount: row.payments.amountPaise / 100,
      receivedDate: row.payments.receivedDate,
      paymentMode: row.payments.paymentMode,
    })),
    providerWise: [...providerMap.entries()].map(([providerName, value]) => ({
      providerName,
      records: value.count,
      billAmount: value.billPaise / 100,
      paidAmount: value.paidPaise / 100,
    })),
  });
});

export const dashboardCharts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { fromDate, toDate } = rangeFilter(req.query);
  const from = fromDate ?? startOfDay(new Date(new Date().getFullYear(), 0, 1));
  const to = toDate ?? endOfDay(new Date());

  const overlapping = await Transaction.find({
    userId,
    fromDate: { $lte: to },
    toDate: { $gte: from },
  });

  const billingMap = new Map<string, number>();
  for (const tx of overlapping) {
    const key = monthKey(tx.fromDate);
    billingMap.set(key, (billingMap.get(key) ?? 0) + tx.billAmountPaise);
  }

  const collections = await Transaction.aggregate([
    { $match: { userId: userObjectId } },
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

  const spareBills = await SparePart.find({
    userId,
    purchaseDate: { $gte: from, $lte: to },
  });
  const spareBillingMap = new Map<string, number>();
  for (const part of spareBills) {
    const key = monthKey(part.purchaseDate);
    spareBillingMap.set(key, (spareBillingMap.get(key) ?? 0) + part.amountPaise);
  }

  const sparePayments = await SparePart.aggregate([
    { $match: { userId: userObjectId } },
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

  return success(res, {
    monthly: {
      billing: [...billingMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, paise]) => ({ month, amount: paise / 100 })),
      collections: collections.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
      })),
      spareBilling: [...spareBillingMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, paise]) => ({ month, amount: paise / 100 })),
      sparePayments: sparePayments.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
      })),
    },
  });
});
