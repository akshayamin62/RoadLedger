import mongoose, { Schema, Types } from "mongoose";

export const PAYMENT_MODES = ["NEFT", "UPI", "CASH"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentEntry {
  amountPaise: number;
  receivedDate: Date;
  paymentMode: PaymentMode;
  createdAt: Date;
}

export interface TransactionDocument extends mongoose.Document {
  userId: Types.ObjectId;
  serialNumber: number;
  vehicleId: Types.ObjectId;
  partyId: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  billNumber: string;
  billAmountPaise: number;
  payments: PaymentEntry[];
  totalReceivedPaise: number;
  pendingAmountPaise: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentEntry>(
  {
    amountPaise: { type: Number, required: true, min: 1 },
    receivedDate: { type: Date, required: true },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const transactionSchema = new Schema<TransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    serialNumber: { type: Number, required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    partyId: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    billNumber: { type: String, required: true, trim: true },
    billAmountPaise: { type: Number, required: true, min: 1 },
    payments: { type: [paymentSchema], default: [] },
    totalReceivedPaise: { type: Number, required: true, default: 0, min: 0 },
    pendingAmountPaise: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true, default: "PENDING" },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, serialNumber: 1 }, { unique: true });
transactionSchema.index({ userId: 1, billNumber: 1 }, { unique: true });
transactionSchema.index({ userId: 1, vehicleId: 1 });
transactionSchema.index({ userId: 1, partyId: 1 });
transactionSchema.index({ userId: 1, paymentStatus: 1 });
transactionSchema.index({ userId: 1, fromDate: 1, toDate: 1 });
transactionSchema.index({ userId: 1, "payments.receivedDate": 1 });

export const Transaction = mongoose.model<TransactionDocument>("Transaction", transactionSchema);
