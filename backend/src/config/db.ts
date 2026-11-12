import mongoose from "mongoose";
import { env } from "./env.js";

type GlobalMongo = typeof globalThis & {
  __roadledgerMongoPromise?: Promise<typeof mongoose>;
};

const globalMongo = globalThis as GlobalMongo;

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!globalMongo.__roadledgerMongoPromise) {
    globalMongo.__roadledgerMongoPromise = mongoose.connect(env.mongoUri);
  }

  await globalMongo.__roadledgerMongoPromise;
  return mongoose;
}
