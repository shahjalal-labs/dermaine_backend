import express from "express";
import { authController } from "./auth.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";

const router = express.Router();

router.post(
  "/login",
  validateRequest(authValidation.loginSchema),
  authController.loginUser,
);
router.post(
  "/google-login",
  validateRequest(authValidation.authLoginSchema),
  authController.googleLogin,
);
router.post("/send-otp", authController.sendForgotPasswordOtp);
router.post("/forget-password", authController.sendForgotPasswordOtp);
router.post("/verify-otp", authController.verifyForgotPasswordOtpCode);
router.patch("/reset-password", auth(), authController.resetPassword);
router.post("/reset-password", auth(), authController.resetPassword);

export const authRoute = router;
