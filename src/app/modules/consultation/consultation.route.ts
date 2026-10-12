import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { consultationValidation } from "./consultation.validation";
import { consultationController } from "./consultation.controller";

import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/book",
  auth(),
  validateRequest(consultationValidation.consultationSchema),
  consultationController.bookConsultation,
);

router.get(
  "/my-consultations",
  auth(),
  consultationController.getMyConsultations,
);

router.get(
  "/all",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  consultationController.getAllConsultations,
);

router.get(
  "/payments",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  consultationController.getAllPayments,
);

router.patch(
  "/:id/status",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  consultationController.updateConsultationStatus,
);

router.get(
  "/fees", 
  consultationController.currentConsultationFees,
);

router.put(
  "/fees",
  // auth(),
  validateRequest(consultationValidation.consultationFeesSchema),
  consultationController.updateConsultationFees,
);

export const consultationRoute = router;
