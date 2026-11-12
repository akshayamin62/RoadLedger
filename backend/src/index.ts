import app from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { migratePartyGstIndex } from "./scripts/migratePartyGstIndex";
import { migrateSparePartPayments } from "./scripts/migrateSparePayments";

async function start() {
  await connectDatabase();
  await migratePartyGstIndex();
  await migrateSparePartPayments();
  app.listen(env.port, () => {
    console.log(`RoadLedger API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
