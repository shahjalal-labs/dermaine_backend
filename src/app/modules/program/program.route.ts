import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import optionalAuth from "../../middlewares/optionalAuth";
import validateRequest from "../../middlewares/validateRequest";
import { programController } from "./program.controller";
import { programValidation } from "./program.validation";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(programValidation.createProgramValidationSchema),
  programController.createProgram,
);

router.get(
  "/",
  optionalAuth(),
  programController.getAllPrograms,
);

router.get(
  "/:id",
  optionalAuth(),
  programController.getProgramById,
);

router.patch(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(programValidation.updateProgramValidationSchema),
  programController.updateProgram,
);

router.delete(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  programController.deleteProgram,
);

export const programRoutes = router;