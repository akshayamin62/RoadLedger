import type { Types } from "mongoose";
import {
  ActivityLog,
  type ActivityAction,
  type ActivityModule,
} from "../models/ActivityLog.js";
import { nextSequence } from "../models/Counter.js";

export async function logActivity(input: {
  userId: Types.ObjectId | string;
  action: ActivityAction;
  module: ActivityModule;
  description: string;
  relatedRecordId?: string;
  performedBy: string;
}) {
  const serialNumber = await nextSequence(`activity:${input.userId.toString()}`);
  await ActivityLog.create({
    userId: input.userId,
    serialNumber,
    action: input.action,
    module: input.module,
    description: input.description,
    relatedRecordId: input.relatedRecordId,
    performedBy: input.performedBy,
  });
}
