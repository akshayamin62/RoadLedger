import { z } from "zod";
import { VEHICLE_TYPES } from "../models/Vehicle.js";
import { objectIdSchema, vehicleNumberSchema } from "./common.js";

export const vehicleBodySchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  registrationNumber: vehicleNumberSchema,
});

export const vehicleQuerySchema = z.object({
  search: z.string().optional(),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const idParamsSchema = z.object({
  id: objectIdSchema,
});
