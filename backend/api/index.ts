import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";
import { connectDatabase } from "../src/config/db";
import { migratePartyGstIndex } from "../src/scripts/migratePartyGstIndex";
import { migrateSparePartPayments } from "../src/scripts/migrateSparePayments";

type GlobalReady = typeof globalThis & {
  __roadledgerReady?: Promise<void>;
};

const globalReady = globalThis as GlobalReady;

async function ensureReady() {
  if (!globalReady.__roadledgerReady) {
    globalReady.__roadledgerReady = (async () => {
      await connectDatabase();
      try {
        await migratePartyGstIndex();
        await migrateSparePartPayments();
      } catch (error) {
        console.error("Migration warning:", error);
      }
    })();
  }
  await globalReady.__roadledgerReady;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureReady();
  } catch (error) {
    console.error("RoadLedger API startup failed:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? `Server startup failed: ${error.message}`
          : "Server startup failed. Check MONGODB_URI and JWT_SECRET on Vercel.",
    });
    return;
  }

  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
