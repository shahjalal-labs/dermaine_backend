import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import optionalAuth from "../../middlewares/optionalAuth";
import { streamController } from "./stream.controller";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.createStream,
);

router.get(
  "/",
  optionalAuth(),
  streamController.getAllStreams,
);

// Placed before "/:id" so "evaluable" isn't swallowed as an :id param
router.get(
  "/evaluable",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.getEvaluableStreams,
);

router.get(
  "/:id",
  optionalAuth(),
  streamController.getStreamById,
);

router.patch(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.updateStream,
);

router.patch(
  "/:id/archive",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.setArchived,
);

router.patch(
  "/:id/disable",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.setDisabled,
);

router.delete(
  "/:id",
  auth(UserRole.Admin, UserRole.SuperAdmin),
  streamController.deleteStream,
);

export const streamRoutes = router;