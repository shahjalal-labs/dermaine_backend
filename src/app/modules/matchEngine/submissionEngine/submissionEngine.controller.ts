import crypto from "crypto";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { submissionService, SubmitAssessmentInput } from "./submissionEngine";

const submitAssessment = catchAsync(async (req, res) => {
  const applicantId =
    req.user?.id ||
    req.body?.applicantId ||
    crypto.randomBytes(12).toString("hex");

  const result = await submissionService.submitAssessment(applicantId, req.body as SubmitAssessmentInput);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment submitted successfully.",
    data: result,
  });
});

const getApplicantResults = catchAsync(async (req, res) => {
  const applicantId = req.params.applicantId || req.user?.id;
  const result = await submissionService.getApplicantResults(applicantId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment results retrieved successfully.",
    data: result,
  });
});

const getMyResults = catchAsync(async (req, res) => {
  const applicantIds = [req.user?.id];
  if (req.user?.email && req.user.email !== req.user.id) applicantIds.push(req.user.email);
  const result = await submissionService.getApplicantResults(applicantIds);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My assessment results retrieved successfully.",
    data: result,
  });
});

const getMySubmissions = catchAsync(async (req, res) => {
  const applicantIds = [req.user?.id];
  if (req.user?.email && req.user.email !== req.user.id) applicantIds.push(req.user.email);
  const result = await submissionService.getApplicantSubmissions(applicantIds);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My assessment submissions retrieved successfully.",
    data: result,
  });
});

const saveDraft = catchAsync(async (req, res) => {
  const applicantId =
    req.user?.id ||
    req.body?.applicantId ||
    req.user?.email ||
    "guest-draft";

  const result = await submissionService.saveDraft(applicantId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment draft saved successfully.",
    data: result,
  });
});

const getApplicantSubmissions = catchAsync(async (req, res) => {
  const applicantId = req.params.applicantId || req.user?.id;
  const result = await submissionService.getApplicantSubmissions(applicantId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Applicant assessment submissions retrieved successfully.",
    data: result,
  });
});

const getSubmissionById = catchAsync(async (req, res) => {
  const result = await submissionService.getSubmissionById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment submission retrieved successfully.",
    data: result,
  });
});

export const submissionEngineController = {
  submitAssessment,
  getApplicantResults,
  getMyResults,
  getMySubmissions,
  saveDraft,
  getApplicantSubmissions,
  getSubmissionById,
};