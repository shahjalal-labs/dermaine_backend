import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { adminController } from "../admin/admin.controller";
import { userDashboardController } from "./dashboard.controller";

const router = express.Router();

// Admin dashboard overview
router.get(
  "/admin",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.getOverviewStats,
);

// User dashboard endpoints
router.get(
  "/user",
  auth(),
  userDashboardController.getUserDashboardStats,
);

router.get(
  "/pathway-matches",
  auth(),
  userDashboardController.getUserPathwayMatches,
);

router.get(
  "/purchase-history",
  auth(),
  userDashboardController.getUserPurchaseHistory,
);

router.get(
  "/immigration-profile",
  auth(),
  userDashboardController.getUserImmigrationProfile,
);

export const dashboardRoutes = router;
