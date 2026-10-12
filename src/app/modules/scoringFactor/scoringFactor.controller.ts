import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { scoringFactorService } from "./scoringFactor.service";

const createScoringFactor = catchAsync(async (req, res) => {
  const result = await scoringFactorService.create(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Scoring factor created successfully.",
    data: result,
  });
});

const findAllScoringFactors = catchAsync(async (req, res) => {
  const result = await scoringFactorService.findAll(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scoring factors retrieved successfully.",
    data: result,
  });
});

const findById = catchAsync(async (req, res) => {
  const result = await scoringFactorService.findById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scoring factor retrieved successfully.",
    data: result,
  });
});

const updateScoringFactor = catchAsync(async (req, res) => {
  const result = await scoringFactorService.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scoring factor updated successfully.",
    data: result,
  });
});

const deleteScoringFactor = catchAsync(async (req, res) => {
  await scoringFactorService.deleteScoringFactor(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scoring factor deleted successfully.",
  });
});

export const scoringFactorController = {
  createScoringFactor,
  findAllScoringFactors,
  findById,
  updateScoringFactor,
  deleteScoringFactor,
};
