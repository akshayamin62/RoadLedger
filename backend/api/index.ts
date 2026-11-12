import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";
import { migratePartyGstIndex } from "../src/scripts/migratePartyGstIndex.js";
import { migrateSparePartPayments } from "../src/scripts/migrateSparePayments.js";

type GlobalReady = typeof globalThis & {
  __roadledgerReady?: Promise<void>;
};

const globalReady = globalThis as GlobalReady;

async function ensureReady() {
  if (!globalReady.__roadledgerReady) {
    globalReady.__roadledgerReady = (async () => {
      await connectDatabase();
      await migratePartyGstIndex();
      await migrateSparePartPayments();
    })();
  }
  await globalReady.__roadledgerReady;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureReady();
  return app(req, res);
}
