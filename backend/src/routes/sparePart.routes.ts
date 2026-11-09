import { Router } from "express";
import {
  createSparePart,
  deleteSparePart,
  listSpareParts,
  updateSparePart,
} from "../controllers/sparePart.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sparePartBodySchema, sparePartQuerySchema } from "../validators/sparePart.js";
import { idParamsSchema } from "../validators/vehicle.js";

const router = Router();
router.use(requireAuth);

router.post("/", validate(sparePartBodySchema), createSparePart);
router.get("/", validate(sparePartQuerySchema, "query"), listSpareParts);
router.put("/:id", validate(idParamsSchema, "params"), validate(sparePartBodySchema), updateSparePart);
router.delete("/:id", validate(idParamsSchema, "params"), deleteSparePart);

export default router;
