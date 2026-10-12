import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { consultationService } from "./consultation.service";

const bookConsultation = catchAsync(async (req, res) => {
  const result = await consultationService.bookConsultationInDB(
    req.body,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation booked successfully.",
    data: result,
  });
});

const currentConsultationFees = catchAsync(async (_req, res) => {
  const consultationFees =
    await consultationService.getCurrentConsultationFees();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation fees retrieved successfully.",
    data: consultationFees,
  });
});

const updateConsultationFees = catchAsync(async (req, res) => {
  const consultationFees = await consultationService.updateConsultationFees(
    req.body,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation fees updated successfully.",
    data: consultationFees,
  });
});

const getAllConsultations = catchAsync(async (req, res) => {
  const result = await consultationService.getAllConsultations(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    req.query.status as string,
    req.query.search as string,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultations retrieved successfully.",
    data: result,
  });
});

const getAllPayments = catchAsync(async (req, res) => {
  const result = await consultationService.getAllPayments(
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 10,
    req.query.search as string,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payments retrieved successfully.",
    data: result,
  });
});

const updateConsultationStatus = catchAsync(async (req, res) => {
  const result = await consultationService.updateConsultationStatus(
    req.params.id,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultation status updated successfully.",
    data: result,
  });
});

const getMyConsultations = catchAsync(async (req, res) => {
  const result = await consultationService.getMyConsultations(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Consultations retrieved successfully.",
    data: result,
  });
});

export const consultationController = {
  bookConsultation,
  currentConsultationFees,
  updateConsultationFees,
  getAllConsultations,
  getMyConsultations,
  getAllPayments,
  updateConsultationStatus,
};
