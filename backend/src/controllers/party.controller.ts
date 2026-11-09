import type { Request, Response } from "express";
import { Party } from "../models/Party.js";
import { Transaction } from "../models/Transaction.js";
import { logActivity } from "../services/activity.service.js";
import { paginated, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, NotFoundError } from "../utils/httpError.js";
import { escapeRegex, parsePagination } from "../utils/pagination.js";
import { serializeParty } from "../utils/serialize.js";

export const createParty = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { name, gstNumber, company } = req.body as {
    name: string;
    gstNumber: string;
    company: "JAY_ROADWAYS" | "JAY_INFRA";
  };

  const duplicate = await Party.findOne({ userId, gstNumber });
  if (duplicate) throw new ConflictError("This GST number already exists");

  const party = await Party.create({ userId, name, gstNumber, company });
  await logActivity({
    userId,
    action: "CREATED",
    module: "PARTY",
    description: `Added party ${name} (${gstNumber})`,
    relatedRecordId: party.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeParty(party), 201, "Party added");
});

export const listParties = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { search, company } = req.query as {
    search?: string;
    company?: "JAY_ROADWAYS" | "JAY_INFRA";
  };
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { userId };
  if (company) filter.company = company;
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { gstNumber: regex }];
  }

  const [items, total] = await Promise.all([
    Party.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Party.countDocuments(filter),
  ]);
  return paginated(res, items.map(serializeParty), { page, limit, total });
});

export const getParty = asyncHandler(async (req: Request, res: Response) => {
  const party = await Party.findOne({ _id: req.params.id, userId: req.auth!.userId });
  if (!party) throw new NotFoundError("Party not found");
  return success(res, serializeParty(party));
});

export const updateParty = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const party = await Party.findOne({ _id: req.params.id, userId });
  if (!party) throw new NotFoundError("Party not found");
  const { name, gstNumber, company } = req.body as {
    name: string;
    gstNumber: string;
    company: "JAY_ROADWAYS" | "JAY_INFRA";
  };

  const duplicate = await Party.findOne({ userId, gstNumber, _id: { $ne: party._id } });
  if (duplicate) throw new ConflictError("This GST number already exists");

  party.name = name;
  party.gstNumber = gstNumber;
  party.company = company;
  await party.save();

  await logActivity({
    userId,
    action: "UPDATED",
    module: "PARTY",
    description: `Updated party ${name}`,
    relatedRecordId: party.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeParty(party), 200, "Party updated");
});

export const deleteParty = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const party = await Party.findOne({ _id: req.params.id, userId });
  if (!party) throw new NotFoundError("Party not found");

  const inUse = await Transaction.exists({ userId, partyId: party._id });
  if (inUse) throw new ConflictError("Cannot delete a party that is used in transactions");

  await party.deleteOne();
  await logActivity({
    userId,
    action: "DELETED",
    module: "PARTY",
    description: `Deleted party ${party.name}`,
    relatedRecordId: party.id,
    performedBy: req.auth!.email,
  });
  return success(res, null, 200, "Party deleted");
});
