import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { organizationController } from "./organization.controller";
import { organizationValidation } from "./organization.validation";

const router = express.Router();

// Registration & invitation routes
router.post(
  "/create-organization-member",
  auth(),
  validateRequest(organizationValidation.organizationMemberSchema),
  organizationController.createNewStaff,
);

router.post(
  "/add-member",
  auth(),
  validateRequest(organizationValidation.organizationMemberSchema),
  organizationController.createNewStaff,
);

router.post(
  "/invite-user",
  auth(),
  validateRequest(organizationValidation.inviteUserSchema),
  organizationController.createNewStaff,
);

router.post(
  "/register-organization-member",
  validateRequest(organizationValidation.registerOrganizationMemberSchema),
  organizationController.registerMember,
);

router.post(
  "/register-organization",
  validateRequest(organizationValidation.registerSchema),
  organizationController.registerOrganization,
);

// Organization Dashboard Routes
router.get(
  "/overview",
  auth(),
  organizationController.getDashboardOverview,
);

router.get(
  "/dashboard-overview",
  auth(),
  organizationController.getDashboardOverview,
);

router.get(
  "/users",
  auth(),
  organizationController.getOrganizationUsers,
);

router.get(
  "/members",
  auth(),
  organizationController.getOrganizationMembers,
);

router.get(
  "/applicants",
  auth(),
  organizationController.getOrganizationApplicants,
);

router.get(
  "/assessments",
  auth(),
  organizationController.getOrganizationAssessments,
);

router.get(
  "/reports",
  auth(),
  organizationController.getOrganizationReports,
);

router.get(
  "/consultations",
  auth(),
  organizationController.getOrganizationConsultations,
);

router.get(
  "/payments",
  auth(),
  organizationController.getOrganizationPayments,
);

export const organizationRoute = router;
