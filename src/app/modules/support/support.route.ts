import express from "express";

import validateRequest from "../../middlewares/validateRequest";
import { supportController } from "./support.controller";
import { supportValidation } from "./support.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

import optionalAuth from "../../middlewares/optionalAuth";

const router = express.Router();

router.post(
  "/send-message",
  optionalAuth(),
  supportController.createSupport,
);

router.post(
  "/contact",
  optionalAuth(),
  supportController.createSupport,
);

router.post(
  "/",
  optionalAuth(),
  supportController.createSupport,
);

router.get(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  supportController.getAllSupportMessages,
);

router.get(
  "/all-messages",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  supportController.getAllSupportMessages,
);

router.patch(
  "/:id/respond",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  supportController.respondToSupport,
);

router.delete(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  supportController.deleteSupport,
);

export const supportRoutes = router;
