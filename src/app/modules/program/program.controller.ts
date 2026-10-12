import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import pick from "../../../shared/pick";
import { programService } from "./program.service";

const createProgram = catchAsync(async (req, res) => {
  const result = await programService.createProgram(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Program created successfully.",
    data: result,
  });
});

const getAllPrograms = catchAsync(async (req, res) => {
  // NOTE: "priority" and "visibility" were removed here — Program
  // doesn't have those fields (only Stream does). Filters below
  // match ListProgramsFilter in program.service.ts exactly.
  const filters = pick(req.query, [
    "search",
    "organizationId",
    "country",
    "category",
    "status",
  ]);
  const options = pick(req.query, ["page", "limit"]);

  const page = options.page ? Number(options.page) : undefined;
  const limit = options.limit ? Number(options.limit) : undefined;

  const result = await programService.findAllPrograms({
    ...filters,
    page,
    limit,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Programs retrieved successfully.",
    data: result,
  });
});

const getProgramById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await programService.findProgramById(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Program retrieved successfully.",
    data: result,
  });
});

const updateProgram = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await programService.updateProgram(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Program updated successfully.",
    data: result,
  });
});

const deleteProgram = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await programService.deleteProgram(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Program deleted successfully.",
    data: result,
  });
});

export const programController = {
  createProgram,
  getAllPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
};