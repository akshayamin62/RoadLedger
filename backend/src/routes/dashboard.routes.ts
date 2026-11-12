import { Router } from "express";
import { dashboardCharts, dashboardSummary } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { dashboardQuerySchema } from "../validators/dashboard";

const router = Router();
router.use(requireAuth);
router.get("/summary", validate(dashboardQuerySchema, "query"), dashboardSummary);
router.get("/charts", validate(dashboardQuerySchema, "query"), dashboardCharts);

export default router;
