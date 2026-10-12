import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";

const createUser = catchAsync(async (req, res) => {
  const result = await userService.createNewAccount(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User account created successfully.",
    data: result,
  });
});
const myProfile = catchAsync(async (req, res) => {
  const user = await userService.getMyProfileFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile retrieved successfully.",
    data: user,
  });
});
const updateProfile = catchAsync(async (req, res) => {
  const result = await userService.updateProfileIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile updated successfully.",
    data: result,
  });
});
const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  await userService.changePassword(newPassword, req.user.id, oldPassword);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Password changed successfully.",
  });
});
const deleteAccount = catchAsync(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Account deleted successfully.",
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const result = await userService.getAllUsersFromDB(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    req.query.search as string,
    req.query.status as any,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users retrieved successfully.",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const result = await userService.updateUserStatus(req.params.id, req.body.status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User status updated successfully.",
    data: result,
  });
});

export const UserControllers = {
  createUser,
  myProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllUsers,
  updateUserStatus,
};
