import { Router } from "express";
import { dashboardCharts, dashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dashboardQuerySchema } from "../validators/dashboard.js";

const router = Router();
router.use(requireAuth);
router.get("/summary", validate(dashboardQuerySchema, "query"), dashboardSummary);
router.get("/charts", validate(dashboardQuerySchema, "query"), dashboardCharts);

export default router;
