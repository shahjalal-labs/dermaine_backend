import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userDashboardService } from "./dashboard.service";

const getUserDashboardStats = catchAsync(async (req, res) => {
  const result = await userDashboardService.getUserDashboardStats(
    req.user.id,
    req.user.email
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User dashboard statistics retrieved successfully.",
    data: result,
  });
});

const getUserPathwayMatches = catchAsync(async (req, res) => {
  const applicantId = (req.query.applicantId as string) || undefined;
  const result = await userDashboardService.getUserPathwayMatches(
    req.user.id,
    req.user.email,
    applicantId
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User pathway matches retrieved successfully.",
    data: result,
  });
});

const getUserPurchaseHistory = catchAsync(async (req, res) => {
  const result = await userDashboardService.getUserPurchaseHistory(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User purchase history retrieved successfully.",
    data: result,
  });
});

const getUserImmigrationProfile = catchAsync(async (req, res) => {
  const result = await userDashboardService.getUserImmigrationProfile(
    req.user.id,
    req.user.email
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User immigration profile retrieved successfully.",
    data: result,
  });
});

export const userDashboardController = {
  getUserDashboardStats,
  getUserPathwayMatches,
  getUserPurchaseHistory,
  getUserImmigrationProfile,
};
