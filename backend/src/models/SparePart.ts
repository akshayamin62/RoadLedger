import mongoose, { Schema, Types } from "mongoose";

export interface SparePartDocument extends mongoose.Document {
  userId: Types.ObjectId;
  partName: string;
  providerName: string;
  purchaseDate: Date;
  amountPaise: number;
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
  },
  { timestamps: true },
);

sparePartSchema.index({ userId: 1, purchaseDate: 1 });
sparePartSchema.index({ userId: 1, partName: 1 });
sparePartSchema.index({ userId: 1, providerName: 1 });

export const SparePart = mongoose.model<SparePartDocument>("SparePart", sparePartSchema);
