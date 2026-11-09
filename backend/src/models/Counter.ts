import mongoose, { Schema } from "mongoose";

export interface CounterDocument extends mongoose.Document {
  key: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = mongoose.model<CounterDocument>("Counter", counterSchema);

export async function nextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}
