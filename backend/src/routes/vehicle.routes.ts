import { Router } from "express";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicle.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParamsSchema, vehicleBodySchema, vehicleQuerySchema } from "../validators/vehicle";

const router = Router();
router.use(requireAuth);

router.post("/", validate(vehicleBodySchema), createVehicle);
router.get("/", validate(vehicleQuerySchema, "query"), listVehicles);
router.get("/:id", validate(idParamsSchema, "params"), getVehicle);
router.put("/:id", validate(idParamsSchema, "params"), validate(vehicleBodySchema), updateVehicle);
router.delete("/:id", validate(idParamsSchema, "params"), deleteVehicle);

export default router;
