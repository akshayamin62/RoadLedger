import { Router } from "express";
import {
  addPayment,
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  nextSerial,
  transactionAnalytics,
  updatePayment,
  updateTransaction,
} from "../controllers/transaction.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  analyticsQuerySchema,
  createTransactionSchema,
  paymentInputSchema,
  paymentParamsSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from "../validators/transaction";
import { idParamsSchema } from "../validators/vehicle";

const router = Router();
router.use(requireAuth);

router.get("/analytics", validate(analyticsQuerySchema, "query"), transactionAnalytics);
router.get("/next-serial", nextSerial);
router.post("/", validate(createTransactionSchema), createTransaction);
router.get("/", validate(transactionQuerySchema, "query"), listTransactions);
router.get("/:id", validate(idParamsSchema, "params"), getTransaction);
router.put("/:id", validate(idParamsSchema, "params"), validate(updateTransactionSchema), updateTransaction);
router.delete("/:id", validate(idParamsSchema, "params"), deleteTransaction);
router.post("/:id/payments", validate(idParamsSchema, "params"), validate(paymentInputSchema), addPayment);
router.put(
  "/:id/payments/:paymentId",
  validate(paymentParamsSchema, "params"),
  validate(paymentInputSchema),
  updatePayment,
);

export default router;
