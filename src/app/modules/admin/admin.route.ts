import express from "express";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import optionalAuth from "../../middlewares/optionalAuth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create-organization",
  auth(UserRole.SuperAdmin),
  validateRequest(adminValidation.organizationSchema),
  adminController.createNewOrganization,
);
router.post(
  "/create-assessment",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  validateRequest(adminValidation.assessmentSchema),
  adminController.createAssessment,
);

router.post(
  "/assessment",
  optionalAuth(),
  adminController.createAssessment,
);

router.post(
  "/submit-assessment",
  optionalAuth(),
  adminController.submitAssessment,
);

router.get("/all-assessments", adminController.getAllAssessments);
router.get("/assessment", adminController.getAllAssessments);
router.get(
  "/assessment-submissions",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.getAllAssessmentSubmissions,
);
router.get(
  "/submissions",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.getAllAssessmentSubmissions,
);
router.get(
  "/submissions/:id",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.getSingleAssessmentSubmission,
);
router.get("/assessment/:id", adminController.assessmentWiseQuestions);
router.delete(
  "/assessment/:id",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.deleteAssessment,
);
router.delete(
  "/delete-assessment/:id",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.deleteAssessment,
);

router.post(
  "/create-question",
  // auth(UserRole.Admin, UserRole.SuperAdmin),
  // validateRequest(adminValidation.createQuestionSchema),
  adminController.createNewQuestion,
);

router.post("/question-group", adminController.createNewGroupQuestion);

router.delete(
  "/delete-question/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  adminController.deleteQuestion,
);
router.delete(
  "/question/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  adminController.deleteQuestion,
);

router.patch(
  "/update-question/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(adminValidation.updateQuestionSchema),
  adminController.updateQuestion,
);
router.patch(
  "/question/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(adminValidation.updateQuestionSchema),
  adminController.updateQuestion,
);

router.post(
  "/create-admin",
  auth(UserRole.SuperAdmin),
  validateRequest(adminValidation.createAdminSchema),
  adminController.createNewAdmin,
);

router.post(
  "/register-admin",
  validateRequest(adminValidation.registerAdminSchema),
  adminController.registerAdmin,
);

router.get(
  "/",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.allAdmins,
);
router.get(
  "/all-admins",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.allAdmins,
);
router.get(
  "/admins",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.allAdmins,
);
router.get(
  "/all-organizations",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.allOrganizations,
);

router.get(
  "/questions-by-type",
  adminController.getQuestionsByType,
);

router.get(
  "/overview",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  adminController.getOverviewStats,
);


router.delete(
  "/delete-admin/:id",
  auth(UserRole.SuperAdmin),
  adminController.deleteAdmin,
);
router.delete(
  "/admin/:id",
  auth(UserRole.SuperAdmin),
  adminController.deleteAdmin,
);

export const adminRoute = router;
