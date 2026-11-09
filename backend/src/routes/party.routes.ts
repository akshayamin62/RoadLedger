import { Router } from "express";
import {
  createParty,
  deleteParty,
  getParty,
  listParties,
  updateParty,
} from "../controllers/party.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { partyBodySchema, partyQuerySchema } from "../validators/party.js";
import { idParamsSchema } from "../validators/vehicle.js";

const router = Router();
router.use(requireAuth);

router.post("/", validate(partyBodySchema), createParty);
router.get("/", validate(partyQuerySchema, "query"), listParties);
router.get("/:id", validate(idParamsSchema, "params"), getParty);
router.put("/:id", validate(idParamsSchema, "params"), validate(partyBodySchema), updateParty);
router.delete("/:id", validate(idParamsSchema, "params"), deleteParty);

export default router;
