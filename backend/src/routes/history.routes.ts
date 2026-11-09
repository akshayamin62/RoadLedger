import { Router } from "express";
import { listHistory } from "../controllers/history.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { historyQuerySchema } from "../validators/history.js";

const router = Router();
router.use(requireAuth);
router.get("/", validate(historyQuerySchema, "query"), listHistory);

export default router;
