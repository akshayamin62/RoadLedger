import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { migratePartyGstIndex } from "./scripts/migratePartyGstIndex.js";
import { migrateSparePartPayments } from "./scripts/migrateSparePayments.js";

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
