import { Router } from "express";
import { listHistory } from "../controllers/history.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { historyQuerySchema } from "../validators/history";

const router = Router();
router.use(requireAuth);
router.get("/", validate(historyQuerySchema, "query"), listHistory);

export default router;
