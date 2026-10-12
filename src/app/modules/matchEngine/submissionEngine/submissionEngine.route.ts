import express from "express";
import optionalAuth from "../../../middlewares/optionalAuth";
import { submissionEngineController } from "./submissionEngine.controller";

const router = express.Router();

router.post("/", optionalAuth(), submissionEngineController.submitAssessment);
router.post("/save-draft", optionalAuth(), submissionEngineController.saveDraft);
router.get("/my-results", optionalAuth(), submissionEngineController.getMyResults);
router.get("/my-submissions", optionalAuth(), submissionEngineController.getMySubmissions);
router.get("/submissions/:applicantId", optionalAuth(), submissionEngineController.getApplicantSubmissions);
router.get("/submission/:id", optionalAuth(), submissionEngineController.getSubmissionById);
router.get("/results/:applicantId", optionalAuth(), submissionEngineController.getApplicantResults);
router.get("/:applicantId", optionalAuth(), submissionEngineController.getApplicantResults);

export const submissionEngineRoute = router;
