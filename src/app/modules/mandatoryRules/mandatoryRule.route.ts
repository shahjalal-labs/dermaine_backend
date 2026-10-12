import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { ruleController } from "./mandatoryRules.controller";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.createRule,
);

router.get(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.getAllRules,
);

router.get(
  "/stream/:streamId/evaluable",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.getEvaluableRulesByStream,
);

router.get(
  "/stream/:streamId/validate-weights",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.validateScoringWeights,
);

router.get(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.getRuleById,
);

router.patch(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.updateRule,
);

router.patch(
  "/:id/status",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.setStatus,
);

router.delete(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  ruleController.deleteRule,
);

export const ruleRoutes = router;