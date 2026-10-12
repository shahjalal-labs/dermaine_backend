import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { occupationSynonymService } from "./occupationSynonym.service";

const getAllOccupationSynonyms = catchAsync(async (req, res) => {
  const result = await occupationSynonymService.getAllOccupationSynonyms({
    search: req.query.search as string,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Occupation synonyms retrieved successfully.",
    data: result,
  });
});

const createOccupationSynonym = catchAsync(async (req, res) => {
  const result = await occupationSynonymService.createOccupationSynonym(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Occupation synonym created successfully.",
    data: result,
  });
});

const deleteOccupationSynonym = catchAsync(async (req, res) => {
  const result = await occupationSynonymService.deleteOccupationSynonym(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Occupation synonym deleted successfully.",
    data: result,
  });
});

export const occupationSynonymController = {
  deleteOccupationSynonym,
  getAllOccupationSynonyms,
  createOccupationSynonym,
};
