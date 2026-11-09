import { Router } from "express";
import {
  addSparePayment,
  createSparePart,
  deleteSparePart,
  getSparePart,
  listSpareParts,
  updateSparePart,
  updateSparePayment,
} from "../controllers/sparePart.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sparePartBodySchema, sparePartQuerySchema, updateSparePartSchema } from "../validators/sparePart.js";
import { paymentInputSchema, paymentParamsSchema } from "../validators/transaction.js";
import { idParamsSchema } from "../validators/vehicle.js";

const router = Router();
router.use(requireAuth);

router.post("/", validate(sparePartBodySchema), createSparePart);
router.get("/", validate(sparePartQuerySchema, "query"), listSpareParts);
router.get("/:id", validate(idParamsSchema, "params"), getSparePart);
router.put("/:id", validate(idParamsSchema, "params"), validate(updateSparePartSchema), updateSparePart);
router.delete("/:id", validate(idParamsSchema, "params"), deleteSparePart);
router.post("/:id/payments", validate(idParamsSchema, "params"), validate(paymentInputSchema), addSparePayment);
router.put(
  "/:id/payments/:paymentId",
  validate(paymentParamsSchema, "params"),
  validate(paymentInputSchema),
  updateSparePayment,
);

export default router;
