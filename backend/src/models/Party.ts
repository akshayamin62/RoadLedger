import mongoose, { Schema, Types } from "mongoose";

export const COMPANIES = ["JAY_ROADWAYS", "JAY_INFRA"] as const;
export type Company = (typeof COMPANIES)[number];

export interface PartyDocument extends mongoose.Document {
  userId: Types.ObjectId;
  name: string;
  gstNumber: string;
  company: Company;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<PartyDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    gstNumber: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, enum: COMPANIES, required: true },
  },
  { timestamps: true },
);

partySchema.index({ userId: 1, gstNumber: 1 }, { unique: true });
partySchema.index({ userId: 1, company: 1 });
partySchema.index({ userId: 1, name: 1 });

export const Party = mongoose.model<PartyDocument>("Party", partySchema);
