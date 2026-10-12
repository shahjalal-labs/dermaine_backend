import crypto from "crypto";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { adminService } from "./admin.service";
import ApiError from "../../../errors/ApiErrors";
import { submissionService } from "../matchEngine/submissionEngine/submissionEngine";

const createNewOrganization = catchAsync(async (req, res) => {
  const result = await adminService.createNewOrganization(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Organization created successfully.",
    data: result,
  });
});

const createAssessment = catchAsync(async (req, res) => {
  // If payload contains answers and an assessment ID, it's a submission (e.g. from frontend submitPRForm)
  if (req.body?.answers && (req.body?.assesmentId || req.body?.assessmentId)) {
    const applicantId =
      req.user?.id ||
      req.body?.applicantId ||
      crypto.randomBytes(12).toString("hex");
    const result = await submissionService.submitAssessment(applicantId, req.body);
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Assessment submitted successfully.",
      data: result,
    });
  }

  if (!req.user || (req.user.role !== "SuperAdmin" && req.user.role !== "Admin")) {
    throw new ApiError(403, "Forbidden! You do not have permission to create assessments.");
  }

  const result = await adminService.createAssessment(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Assessment created successfully.",
    data: result,
  });
});

const submitAssessment = catchAsync(async (req, res) => {
  const applicantId =
    req.user?.id ||
    req.body?.applicantId ||
    crypto.randomBytes(12).toString("hex");
  const result = await submissionService.submitAssessment(applicantId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment submitted successfully.",
    data: result,
  });
});
const getAllAssessments = catchAsync(async (req, res) => {
  const rawSearch = req.query.search as string;
  const search = (!rawSearch || rawSearch === "undefined" || rawSearch === "null" || !rawSearch.trim()) ? undefined : rawSearch.trim();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await adminService.getAllAssessments({ search, page, limit });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessments retrieved successfully.",
    data: result,
  });
});

const assessmentWiseQuestions = catchAsync(async (req, res) => {
  const result = await adminService.assesmentWiseQuestionsFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment retrieved successfully.",
    data: result,
  });
});
const createNewQuestion = catchAsync(async (req, res) => {
  const result = await adminService.createNewQuestion(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Question created successfully.",
    data: result,
  });
});
const createNewGroupQuestion = catchAsync(async (req, res) => {
  const result = await adminService.createQuestionGroup(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Question group created successfully.",
    data: result,
  });
});
const deleteQuestion = catchAsync(async (req, res) => {
  await adminService.deleteQuestion(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question deleted successfully.",
  });
});
const updateQuestion = catchAsync(async (req, res) => {
  const result = await adminService.updateQuestion(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question updated successfully.",
    data: result,
  });
});
const createNewAdmin = catchAsync(async (req, res) => {
  const result = await adminService.createNewAdmin(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Admin created successfully.",
    data: result,
  });
});
const registerAdmin = catchAsync(async (req, res) => {
  await adminService.registerAdmin(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Admin registered successfully.",
  });
});
const allAdmins = catchAsync(async (req, res) => {
  const rawSearch = req.query.search as string;
  const search = (!rawSearch || rawSearch === "undefined" || rawSearch === "null" || !rawSearch.trim()) ? undefined : rawSearch.trim();
  const result = await adminService.getAllAdminsFromDB(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    search,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admins retrieved successfully.",
    data: result,
  });
});
const allOrganizations = catchAsync(async (req, res) => {
  const rawSearch = req.query.search as string;
  const search = (!rawSearch || rawSearch === "undefined" || rawSearch === "null" || !rawSearch.trim()) ? undefined : rawSearch.trim();
  const result = await adminService.getAllOrganizationsFromDB(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    search,
    req.query.status as string,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organizations retrieved successfully.",
    data: result,
  });
});
const getQuestionsByType = catchAsync(async (req, res) => {
  const result = await adminService.getGetQuestionTypeWise(
    ((req.query.questionType || req.query.type) as string),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Questions retrieved successfully.",
    data: result,
  });
});

const getOverviewStats = catchAsync(async (req, res) => {
  const result = await adminService.getOverviewStats({
    year: req.query.year ? parseInt(req.query.year as string) : undefined,
    filter: req.query.filter as string,
    userLimit: req.query.userLimit ? parseInt(req.query.userLimit as string) : undefined,
    search: req.query.search as string,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Overview statistics retrieved successfully.",
    data: result,
  });
});

const getAllAssessmentSubmissions = catchAsync(async (req, res) => {
  const result = await adminService.getAllAssessmentSubmissions(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    req.query.search as string,
    req.query.status as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment submissions retrieved successfully.",
    data: result,
  });
});

const getSingleAssessmentSubmission = catchAsync(async (req, res) => {
  const result = await adminService.getSingleAssessmentSubmission(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment submission retrieved successfully.",
    data: result,
  });
});

const deleteAssessment = catchAsync(async (req, res) => {
  await adminService.deleteAssessment(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment deleted successfully.",
  });
});

const deleteAdmin = catchAsync(async (req, res) => {
  await adminService.deleteAdminFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin deleted successfully.",
  });
});

export const adminController = {
  createNewOrganization,
  getAllAssessments,
  assessmentWiseQuestions,
  createNewQuestion,
  updateQuestion,
  deleteQuestion,
  createAssessment,
  createNewAdmin,
  registerAdmin,
  allAdmins,
  allOrganizations,
  getQuestionsByType,
  createNewGroupQuestion,
  getOverviewStats,
  getAllAssessmentSubmissions,
  getSingleAssessmentSubmission,
  deleteAssessment,
  submitAssessment,
  deleteAdmin,
};

