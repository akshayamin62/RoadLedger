import { Router } from "express";
import {
  createParty,
  deleteParty,
  getParty,
  listParties,
  updateParty,
} from "../controllers/party.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { partyBodySchema, partyQuerySchema } from "../validators/party";
import { idParamsSchema } from "../validators/vehicle";

const router = Router();
router.use(requireAuth);

router.post("/", validate(partyBodySchema), createParty);
router.get("/", validate(partyQuerySchema, "query"), listParties);
router.get("/:id", validate(idParamsSchema, "params"), getParty);
router.put("/:id", validate(idParamsSchema, "params"), validate(partyBodySchema), updateParty);
router.delete("/:id", validate(idParamsSchema, "params"), deleteParty);

export default router;
