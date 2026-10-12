import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import optionalAuth from "../../middlewares/optionalAuth";
import { availabilityController } from "./availability.controller";

const router = express.Router();


router.get("/all", optionalAuth(), availabilityController.getAvailability);
router.post("/slot", auth(UserRole.Admin, UserRole.SuperAdmin), availabilityController.createNewSlot);
router.delete("/slot/:id", auth(UserRole.Admin, UserRole.SuperAdmin), availabilityController.deleteSlot);
router.get("/slots", availabilityController.getDayWiseSlots);
router.get("/slots/:dayOfWeek", availabilityController.getDayWiseSlots);

export const availabilityRoutes = router;
