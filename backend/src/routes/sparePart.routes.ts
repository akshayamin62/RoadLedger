import { Router } from "express";
import {
  addSparePayment,
  createSparePart,
  deleteSparePart,
  getSparePart,
  listSpareParts,
  updateSparePart,
  updateSparePayment,
} from "../controllers/sparePart.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { sparePartBodySchema, sparePartQuerySchema, updateSparePartSchema } from "../validators/sparePart";
import { paymentInputSchema, paymentParamsSchema } from "../validators/transaction";
import { idParamsSchema } from "../validators/vehicle";

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
