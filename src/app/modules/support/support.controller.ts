import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { supportService } from "./support.service";

const createSupport = catchAsync(async (req, res) => {
  const result = await supportService.createSupport({
    userId: req.user?.id,
    message: req.body.message || req.body.text || "",
    name: req.body.name || req.body.fullName,
    email: req.body.email,
    phone: req.body.phone || req.body.phoneNumber,
    referralSource: req.body.referralSource || req.body.source || req.body.howDidYouLearn,
  });
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Support ticket / inquiry sent successfully.",
    data: result,
  });
});

const getAllSupportMessages = catchAsync(async (req, res) => {
  const result = await supportService.getAllSupportMessages(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    req.query.search as string,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Support messages retrieved successfully.",
    data: result,
  });
});

const respondToSupport = catchAsync(async (req, res) => {
  const result = await supportService.respondToSupport(req.params.id, req.body.adminResponse);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Response submitted successfully.",
    data: result,
  });
});

const deleteSupport = catchAsync(async (req, res) => {
  await supportService.deleteSupport(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Support message deleted successfully.",
  });
});

export const supportController = {
  createSupport,
  getAllSupportMessages,
  respondToSupport,
  deleteSupport,
};