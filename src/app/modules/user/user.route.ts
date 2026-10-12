import express from "express";
import { UserControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";

import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create",
  validateRequest(userValidation.userRegisterValidationSchema),
  UserControllers.createUser,
);
router.get(
  "/",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  UserControllers.getAllUsers,
);
router.get(
  "/all",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  UserControllers.getAllUsers,
);
router.patch(
  "/:id/status",
  auth(UserRole.SuperAdmin, UserRole.Admin),
  UserControllers.updateUserStatus,
);
router.get("/my-profile", auth(), UserControllers.myProfile);
router.get("/profile", auth(), UserControllers.myProfile);
router.get("/me", auth(), UserControllers.myProfile);
router.put(
  "/update-profile",
  auth(),
  fileUploader.profileImage,
  parseBodyData,
  UserControllers.updateProfile,
);
router.put(
  "/change-password",
  auth(),
  validateRequest(userValidation.userChangePasswordValidationSchema),
  UserControllers.changePassword,
);
router.delete("/delete-account", auth(), UserControllers.deleteAccount);

export const userRoutes = router;
