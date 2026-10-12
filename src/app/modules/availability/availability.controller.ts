import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { availabilityService } from "./availability.service";



const getAvailability = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const workerId = req.user?.id;
  let availability;
  if (workerId) {
    availability = await availabilityService.getAvailabilityByWorkerId(workerId);
  }
  if (!availability || !availability.length) {
    const days = [0, 1, 2, 3, 4, 5, 6];
    availability = await Promise.all(
      days.map((d) => availabilityService.getDayWiseSlots(d)),
    );
  }
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Availability retrieved successfully",
    data: availability,
  });
});

const createNewSlot = catchAsync(async (req: Request, res: Response) => {
  const { dayOfWeek, startTime } = req.body;
  await availabilityService.createNewSlot(dayOfWeek, startTime);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "New slot created successfully",
  });
});

const deleteSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await availabilityService.deleteSlot(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slot deleted successfully",
  });
});

const getDayWiseSlots = catchAsync(async (req: Request, res: Response) => {
  const rawDay = req.params.dayOfWeek ?? req.query.dayOfWeek;
  const dayOfWeek = rawDay !== undefined ? parseInt(rawDay as string, 10) : new Date().getDay();
  const slots = await availabilityService.getDayWiseSlots(dayOfWeek);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Day-wise slots retrieved successfully",
    data: slots,
  });
});

export const availabilityController = {
  getAvailability,
  createNewSlot,
  deleteSlot,
  getDayWiseSlots,
};
