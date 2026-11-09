import mongoose, { Schema, Types } from "mongoose";

export const VEHICLE_TYPES = ["TM", "DUMPER"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface VehicleDocument extends mongoose.Document {
  userId: Types.ObjectId;
  vehicleType: VehicleType;
  registrationNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<VehicleDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
  },
  { timestamps: true },
);

vehicleSchema.index({ userId: 1, registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ userId: 1, vehicleType: 1 });

export const Vehicle = mongoose.model<VehicleDocument>("Vehicle", vehicleSchema);
