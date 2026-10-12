import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import pick from "../../../shared/pick";
import { streamService } from "./stream.service";

const createStream = catchAsync(async (req, res) => {
  const result = await streamService.createStream(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Stream created successfully.",
    data: result,
  });
});

const getAllStreams = catchAsync(async (req, res) => {
  const filters = pick(req.query, [
    "programId",
    "organizationId",
    "country",
    "status",
    "assessmentType",
    "includeArchived",
    "includeDisabled",
  ]);
  const options = pick(req.query, ["page", "limit"]);

  const page = options.page ? Number(options.page) : undefined;
  const limit = options.limit ? Number(options.limit) : undefined;

  // includeArchived/includeDisabled arrive as strings from query params
  const result = await streamService.findAllStreams({
    ...filters,
    includeArchived: filters.includeArchived === "true",
    includeDisabled: filters.includeDisabled === "true",
    page,
    limit,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Streams retrieved successfully.",
    data: result,
  });
});

const getStreamById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await streamService.findStreamById(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stream retrieved successfully.",
    data: result,
  });
});

const updateStream = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await streamService.updateStream(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stream updated successfully.",
    data: result,
  });
});

const setArchived = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isArchived } = req.body;
  const result = await streamService.setArchived(id, isArchived);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Stream ${isArchived ? "archived" : "unarchived"} successfully.`,
    data: result,
  });
});

const setDisabled = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isDisabled } = req.body;
  const result = await streamService.setDisabled(id, isDisabled);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Stream ${isDisabled ? "disabled" : "enabled"} successfully.`,
    data: result,
  });
});

const deleteStream = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await streamService.deleteStream(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stream deleted successfully.",
    data: result,
  });
});

// Not applicant-facing — used by the admin Testing Sandbox (doc
// section 15) or internally by the matching engine to preview which
// streams would be evaluated for a given assessment type/country.
const getEvaluableStreams = catchAsync(async (req, res) => {
  const { assessmentType, country } = req.query as { assessmentType: string; country: string };
  const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : undefined;
  const allowOverride = req.query.allowOverride === "true";

  const result = await streamService.findEvaluableStreams({
    assessmentType: assessmentType as any,
    country,
    asOfDate,
    allowOverride,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Evaluable streams retrieved successfully.",
    data: result,
  });
});

export const streamController = {
  createStream,
  getAllStreams,
  getStreamById,
  updateStream,
  setArchived,
  setDisabled,
  deleteStream,
  getEvaluableStreams,
};