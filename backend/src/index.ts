import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { migratePartyGstIndex } from "./scripts/migratePartyGstIndex.js";
import { migrateSparePartPayments } from "./scripts/migrateSparePayments.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import historyRoutes from "./routes/history.routes.js";
import partyRoutes from "./routes/party.routes.js";
import sparePartRoutes from "./routes/sparePart.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "RoadLedger API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/spare-parts", sparePartRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

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
