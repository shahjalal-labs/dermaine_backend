import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { authService } from "./auth.service";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../../errors/ApiErrors";

const loginUser = catchAsync(async (req, res) => {
  const result = await authService.loginUserIntoDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User successfully logged in",
    data: result,
  });
});
const googleLogin = catchAsync(async (req, res) => {
  const result = await authService.googleLogin(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User successfully logged in with Google",
    data: result,
  });
});

const sendForgotPasswordOtp = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.body?.email as string;
    if (!email) {
      throw new ApiError(400, "Email is required");
    }
    const response = await authService.sendForgotPasswordOtpDB(email);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OTP send successfully",
      data: response,
    });
  },
);

const verifyForgotPasswordOtpCode = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const response = await authService.verifyForgotPasswordOtpCodeDB(payload);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OTP verified successfully.",
      data: response,
    });
  },
);

const resetPassword = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "User authorization required to reset password.");
    }
    const password = req.body?.newPassword || req.body?.password;
    if (!password) {
      throw new ApiError(400, "New password is required.");
    }
    const result = await authService.resetForgotPasswordDB(password, userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Password updated successfully.",
      data: result,
    });
  },
);

export const authController = {
  loginUser,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtpCode,
  resetPassword,
  googleLogin,
};
