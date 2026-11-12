import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import historyRoutes from "./routes/history.routes.js";
import partyRoutes from "./routes/party.routes.js";
import sparePartRoutes from "./routes/sparePart.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";

const applyHelmet = (
  helmet as unknown as { default?: () => RequestHandler } & (() => RequestHandler)
).default
  ? (helmet as unknown as { default: () => RequestHandler }).default
  : (helmet as unknown as () => RequestHandler);

const app = express();

app.set("trust proxy", 1);
app.use(applyHelmet());
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

export default app;
