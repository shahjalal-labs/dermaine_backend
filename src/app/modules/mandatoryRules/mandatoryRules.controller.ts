import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import pick from "../../../shared/pick";
import { ruleService } from "./mandatoryRule.service";


const createRule = catchAsync(async (req, res) => {
  // createdBy comes from the authenticated user, never the request
  // body — client point 9: system-generated, not manually entered.
  const result = await ruleService.createRule({
    ...req.body,
    createdBy: req.user?.id,
  });
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Rule created successfully.",
    data: result,
  });
});

const getAllRules = catchAsync(async (req, res) => {
  const filters = pick(req.query, ["streamId", "rulePurpose", "status", "ruleCategory"]);
  const options = pick(req.query, ["page", "limit"]);

  const page = options.page ? Number(options.page) : undefined;
  const limit = options.limit ? Number(options.limit) : undefined;

  const result = await ruleService.findAllRules({ ...filters, page, limit });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Rules retrieved successfully.",
    data: result,
  });
});

// Used by the applicant-facing matching engine and by the admin
// Testing Sandbox (doc section 15 — pass includeTesting=true there).
const getEvaluableRulesByStream = catchAsync(async (req, res) => {
  const { streamId } = req.params;
  const includeTesting = req.query.includeTesting === "true";
  const result = await ruleService.findEvaluableByStream(streamId, includeTesting);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Evaluable rules retrieved successfully.",
    data: result,
  });
});

const getRuleById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ruleService.findRuleById(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Rule retrieved successfully.",
    data: result,
  });
});

const updateRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ruleService.updateRule(id, {
    ...req.body,
    updatedBy: req.user?.id,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Rule updated successfully.",
    data: result,
  });
});

const setStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await ruleService.setStatus(id, status, req.user?.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Rule status updated successfully.",
    data: result,
  });
});

const deleteRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ruleService.deleteRule(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Rule deleted successfully.",
    data: result,
  });
});

// Client point 6 — surfaces the weight-sum warning/validation for a
// stream's scoring factors. Frontend decides how to display it
// (block save vs. warning banner) based on the stream's status.
const validateScoringWeights = catchAsync(async (req, res) => {
  const { streamId } = req.params;
  const result = await ruleService.validateScoringWeights(streamId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scoring weight validation complete.",
    data: result,
  });
});

export const ruleController = {
  createRule,
  getAllRules,
  getEvaluableRulesByStream,
  getRuleById,
  updateRule,
  setStatus,
  deleteRule,
  validateScoringWeights,
};