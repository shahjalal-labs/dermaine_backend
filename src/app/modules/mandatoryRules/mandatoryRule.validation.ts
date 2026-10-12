import { z } from "zod";
import {
  RulePurpose,
  RuleStatus,
  RuleOperator,
  FailureResult,
  ScoringMethod,
  OccupationMatchType,
  QuestionInputType,
} from "@prisma/client";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

// Client point 3: Occupation Matching only applies to these categories.
const OCCUPATION_RELATED_CATEGORIES = ["occupation", "work_experience"];

const occupationConditionSchema = z.object({
  nocCode: z.string().optional(),
  occupationName: z.string().optional(),
  teer: z.number().int().min(0).max(5).optional(),
  occupationCategory: z.string().optional(),
  priorityOccupation: z.boolean().optional(),
  matchType: z.nativeEnum(OccupationMatchType).optional(),
  includedNocList: z.array(z.string()).optional(),
  excludedNocList: z.array(z.string()).optional(),
});

const baseRuleFields = {
  streamId: objectId,
  organizationId: objectId.optional(),

  ruleName: z.string({ required_error: "ruleName is required" }).min(1),
  ruleGroup: z.string().optional(),
  ruleCategory: z.string({ required_error: "ruleCategory is required" }).min(1),
  rulePurpose: z.nativeEnum(RulePurpose, { required_error: "rulePurpose is required" }),
  status: z.nativeEnum(RuleStatus).optional(),
  priorityOrder: z.number().int().optional(),

  assessmentSection: z.string().optional(),
  questionId: z.string().optional(),
  dataField: z.string().optional(),
  dataType: z.nativeEnum(QuestionInputType).optional(),
  operator: z.nativeEnum(RuleOperator, { required_error: "operator is required" }),
  comparisonValue: z.string().optional(),
  secondaryValue: z.string().optional(), // required for BETWEEN — checked in refine below

  // Mandatory-only
  failureResult: z.nativeEnum(FailureResult).optional(),
  missingRequirementMessage: z.string().optional(),
  furtherReviewRequired: z.boolean().optional(),

  // Scoring-only
  weightPercentage: z.number().min(0).max(100).optional(),
  maximumFactorScore: z.number().optional(),
  scoringMethod: z.nativeEnum(ScoringMethod).optional(),
  scoreAwarded: z.number().optional(),
  scoringBands: z.any().optional(),

  occupationCondition: occupationConditionSchema.optional(),

  whyRecommended: z.string().optional(),
  improvementRecommendation: z.string().optional(),
  nextSteps: z.string().optional(),

  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().optional(),
  doesNotExpire: z.boolean().optional(),
  changeNotes: z.string().optional(),
};

// Mirrors validateRulePurposeFields() in rule.service.ts — kept in
// sync deliberately so bad requests are rejected at the validation
// layer (400) instead of falling through to the service (500).
function applyRulePurposeRefinements(schema: z.ZodTypeAny) {
  return schema.superRefine((data: any, ctx: z.RefinementCtx) => {
    if (data.rulePurpose === RulePurpose.MANDATORY_ELIGIBILITY_RULE) {
      if (!data.failureResult) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["failureResult"],
          message: "failureResult is required for a Mandatory Eligibility Rule",
        });
      }
      if (data.weightPercentage !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weightPercentage"],
          message: "weightPercentage should not be set on a Mandatory Eligibility Rule",
        });
      }
    }

    if (data.rulePurpose === RulePurpose.SCORING_FACTOR) {
      if (data.weightPercentage === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weightPercentage"],
          message: "weightPercentage is required for a Scoring Factor",
        });
      }
      if (!data.scoringMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoringMethod"],
          message: "scoringMethod is required for a Scoring Factor",
        });
      }
      if (data.failureResult) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["failureResult"],
          message: "failureResult should not be set on a Scoring Factor",
        });
      }
    }

    if (data.operator === RuleOperator.BETWEEN && !data.secondaryValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryValue"],
        message: "secondaryValue is required when operator is BETWEEN",
      });
    }

    if (
      data.ruleCategory &&
      data.occupationCondition &&
      !OCCUPATION_RELATED_CATEGORIES.includes(data.ruleCategory)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupationCondition"],
        message: `occupationCondition should only be set when ruleCategory is one of: ${OCCUPATION_RELATED_CATEGORIES.join(", ")}`,
      });
    }
  });
}

const createRuleValidationSchema = z.object({
  body: applyRulePurposeRefinements(z.object(baseRuleFields)),
});


// const updateRuleBodySchema = z.object({
//   ...Object.fromEntries(
//     Object.entries(baseRuleFields).map(([key, schema]) => [
//       key,
//       key === "streamId" ? schema : (schema as z.ZodTypeAny).optional(),
//     ]),
//   ),
//   updatedBy: z.string().optional(),
// }).omit({ streamId: true });

// const updateRuleValidationSchema = z.object({
//   body: applyRulePurposeRefinements(updateRuleBodySchema),
// });

export const ruleValidation = {
  createRuleValidationSchema,
//   updateRuleValidationSchema,
};