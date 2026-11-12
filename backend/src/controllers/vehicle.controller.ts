import type { Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { Vehicle } from "../models/Vehicle";
import { logActivity } from "../services/activity.service";
import { success, paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ConflictError, NotFoundError } from "../utils/httpError";
import { escapeRegex, parsePagination } from "../utils/pagination";
import { serializeVehicle } from "../utils/serialize";

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { vehicleType, registrationNumber } = req.body as {
    vehicleType: "TM" | "DUMPER";
    registrationNumber: string;
  };

  const duplicate = await Vehicle.findOne({ userId, registrationNumber });
  if (duplicate) throw new ConflictError("This vehicle registration number already exists");

  const vehicle = await Vehicle.create({ userId, vehicleType, registrationNumber });
  await logActivity({
    userId,
    action: "CREATED",
    module: "VEHICLE",
    description: `Added vehicle ${registrationNumber} (${vehicleType})`,
    relatedRecordId: vehicle.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeVehicle(vehicle), 201, "Vehicle added");
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const { search, vehicleType } = req.query as { search?: string; vehicleType?: "TM" | "DUMPER" };
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { userId };
  if (vehicleType) filter.vehicleType = vehicleType;
  if (search) filter.registrationNumber = { $regex: escapeRegex(search.toUpperCase()), $options: "i" };

  const [items, total] = await Promise.all([
    Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Vehicle.countDocuments(filter),
  ]);
  return paginated(res, items.map(serializeVehicle), { page, limit, total });
});

export const getVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, userId: req.auth!.userId });
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  return success(res, serializeVehicle(vehicle));
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const vehicle = await Vehicle.findOne({ _id: req.params.id, userId });
  if (!vehicle) throw new NotFoundError("Vehicle not found");

  const { vehicleType, registrationNumber } = req.body as {
    vehicleType: "TM" | "DUMPER";
    registrationNumber: string;
  };

  const duplicate = await Vehicle.findOne({
    userId,
    registrationNumber,
    _id: { $ne: vehicle._id },
  });
  if (duplicate) throw new ConflictError("This vehicle registration number already exists");

  vehicle.vehicleType = vehicleType;
  vehicle.registrationNumber = registrationNumber;
  await vehicle.save();

  await logActivity({
    userId,
    action: "UPDATED",
    module: "VEHICLE",
    description: `Updated vehicle ${registrationNumber}`,
    relatedRecordId: vehicle.id,
    performedBy: req.auth!.email,
  });
  return success(res, serializeVehicle(vehicle), 200, "Vehicle updated");
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const vehicle = await Vehicle.findOne({ _id: req.params.id, userId });
  if (!vehicle) throw new NotFoundError("Vehicle not found");

  const inUse = await Transaction.exists({ userId, vehicleId: vehicle._id });
  if (inUse) {
    throw new ConflictError("Cannot delete a vehicle that is used in transactions");
  }

  await vehicle.deleteOne();
  await logActivity({
    userId,
    action: "DELETED",
    module: "VEHICLE",
    description: `Deleted vehicle ${vehicle.registrationNumber}`,
    relatedRecordId: vehicle.id,
    performedBy: req.auth!.email,
  });
  return success(res, null, 200, "Vehicle deleted");
});
