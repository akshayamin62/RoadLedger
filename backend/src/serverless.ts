import type { Request, Response, NextFunction } from "express";
import app from "./app";
import { connectDatabase } from "./config/db";
import { migratePartyGstIndex } from "./scripts/migratePartyGstIndex";
import { migrateSparePartPayments } from "./scripts/migrateSparePayments";

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

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureReady();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? `Server startup failed: ${error.message}`
          : "Server startup failed",
    });
  }
});

export default app;
