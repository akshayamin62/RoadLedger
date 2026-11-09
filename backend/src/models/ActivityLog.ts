import mongoose, { Schema, Types } from "mongoose";

export const ACTIVITY_MODULES = [
  "AUTH",
  "VEHICLE",
  "PARTY",
  "TRANSACTION",
  "PAYMENT",
  "SPARE_PART",
] as const;
export type ActivityModule = (typeof ACTIVITY_MODULES)[number];

export const ACTIVITY_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CREATED",
  "UPDATED",
  "DELETED",
  "PAYMENT_RECEIVED",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityLogDocument extends mongoose.Document {
  userId: Types.ObjectId;
  serialNumber: number;
  action: ActivityAction;
  module: ActivityModule;
  description: string;
  relatedRecordId?: string;
  performedBy: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    serialNumber: { type: Number, required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    module: { type: String, enum: ACTIVITY_MODULES, required: true },
    description: { type: String, required: true },
    relatedRecordId: { type: String },
    performedBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ userId: 1, serialNumber: 1 }, { unique: true });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, module: 1 });
activityLogSchema.index({ userId: 1, action: 1 });

export const ActivityLog = mongoose.model<ActivityLogDocument>("ActivityLog", activityLogSchema);
