import type { Request, Response } from "express";
import mongoose from "mongoose";
import { SparePart } from "../models/SparePart.js";
import { logActivity } from "../services/activity.service.js";
import { success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { endOfDay, monthKey, startOfDay } from "../utils/dates.js";
import { NotFoundError } from "../utils/httpError.js";
import { rupeesToPaise } from "../utils/money.js";
import { escapeRegex, parsePagination } from "../utils/pagination.js";
import { serializeSparePart } from "../utils/serialize.js";

export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { partName, providerName, purchaseDate, amount } = req.body as {
    partName: string;
    providerName: string;
    purchaseDate: Date;
    amount: number;
  };
  const part = await SparePart.create({
    userId,
    partName,
    providerName,
    purchaseDate,
    amountPaise: rupeesToPaise(amount),
  });
  await logActivity({
    userId,
    action: "CREATED",
    module: "SPARE_PART",
    description: `Added spare part ${partName} from ${providerName}`,
    relatedRecordId: part.id,
    performedBy: req.auth!.email,
  });
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

  const [items, total, totals] = await Promise.all([
    SparePart.find(filter).sort(sort).skip(skip).limit(limit),
    SparePart.countDocuments(filter),
    SparePart.aggregate([
      { $match: filter },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
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
      monthlyExpenditure: monthly.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
        amount: row.totalPaise / 100,
        monthKey: monthKey(new Date(row._id.year, row._id.month - 1, 1)),
      })),
    },
  });
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
  part.partName = partName;
  part.providerName = providerName;
  part.purchaseDate = purchaseDate;
  part.amountPaise = rupeesToPaise(amount);
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
