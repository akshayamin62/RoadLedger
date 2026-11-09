import mongoose, { Schema, Types } from "mongoose";
import {
  PAYMENT_STATUSES,
  paymentSchema,
  type PaymentEntry,
  type PaymentStatus,
} from "./Transaction.js";

export interface SparePartDocument extends mongoose.Document {
  userId: Types.ObjectId;
  partName: string;
  providerName: string;
  purchaseDate: Date;
  amountPaise: number;
  payments: PaymentEntry[];
  totalPaidPaise: number;
  pendingAmountPaise: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const sparePartSchema = new Schema<SparePartDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    partName: { type: String, required: true, trim: true },
    providerName: { type: String, required: true, trim: true },
    purchaseDate: { type: Date, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    payments: { type: [paymentSchema], default: [] },
    totalPaidPaise: { type: Number, required: true, default: 0, min: 0 },
    pendingAmountPaise: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true, default: "PENDING" },
  },
  { timestamps: true },
);

sparePartSchema.index({ userId: 1, purchaseDate: 1 });
sparePartSchema.index({ userId: 1, partName: 1 });
sparePartSchema.index({ userId: 1, providerName: 1 });
sparePartSchema.index({ userId: 1, paymentStatus: 1 });
sparePartSchema.index({ userId: 1, "payments.receivedDate": 1 });

export const SparePart = mongoose.model<SparePartDocument>("SparePart", sparePartSchema);
