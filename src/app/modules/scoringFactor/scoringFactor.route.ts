import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { scoringFactorController } from "./scoringFactor.controller";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  scoringFactorController.createScoringFactor,
);

router.get(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  scoringFactorController.findAllScoringFactors,
);

router.get(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  scoringFactorController.findById,
);

router.patch(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  scoringFactorController.updateScoringFactor,
);

router.delete(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  scoringFactorController.deleteScoringFactor,
);

export const scoringFactorRoutes = router;
