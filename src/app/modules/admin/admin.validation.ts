import { z } from "zod";

const QuestionInputTypeEnum = z.enum([
  "TEXT",
  "NUMBER",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "DATE",
  "EMAIL",
  "PHONE",
  "TEXTAREA",
]);

const organizationSchema = z.object({
  slug: z.string().min(1, "Slug is required").trim(),
  type: z.string().min(1, "Type is required").trim(),
  status: z.string().min(1, "Status is required").trim(),
  plan: z.string().min(1, "Plan is required").trim(),
  billingEmail: z.string().email("Invalid billing email"),
  billingName: z.string().min(1, "Billing name is required").trim(),
  maxUsers: z.number().int().min(0, "Max users must be 0 or greater"),
  maxAssessments: z
    .number()
    .int()
    .min(1, "Max assessments must be 1 or greater"),
  maxReports: z.number().int().min(0, "Max reports must be 0 or greater"),
  companyName: z.string().min(1, "Company name is required").trim(),
  notes: z.string().optional().default(""),
});

const questionOptionSchema = z.object({
  label: z.string().trim().min(1, "Option label is required"),
  value: z.string().trim().min(1, "Option value is required"),
});
const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Assessment title is required"),
});

const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters long").trim(),
});
const registerAdminSchema = z.object({
  token: z.string().min(1, "Token is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const createQuestionSchema = z
  .object({
    assesmentId: z.string().min(1, "assesmentId is required"),
    questionId: z.string().trim().min(1, "questionId is required"),
    questionText: z.string().trim().min(1, "questionText is required"),
    questionType: z.string().trim().min(1, "questionType is required"),
    inputType: QuestionInputTypeEnum,
    order: z.number().int().nonnegative().optional(),
    options: z.array(questionOptionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const needsOptions =
      data.inputType === "SELECT" || data.inputType === "MULTI_SELECT";

    if (needsOptions && (!data.options || data.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `options are required when inputType is "${data.inputType}"`,
        path: ["options"],
      });
    }

    if (!needsOptions && data.options && data.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `options should not be provided when inputType is "${data.inputType}"`,
        path: ["options"],
      });
    }
  });

const updateQuestionSchema = z.object({
  questionText: z.string().trim().min(1).optional(),
  questionType: z.string().trim().min(1).optional(),
  inputType: QuestionInputTypeEnum.optional(),
  order: z.number().int().nonnegative().optional(),
  isOptional: z.boolean().optional(),
  isCountry: z.boolean().optional(),
  helpText: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  dependsOnQuestionId: z.string().nullable().optional(),
  dependsOnOperator: z.string().nullable().optional(),
  dependsOnValue: z.string().nullable().optional(),
  options: z.array(questionOptionSchema).optional(),
});

export const adminValidation = {
  createQuestionSchema,
  updateQuestionSchema,
  organizationSchema,
  assessmentSchema,
  createAdminSchema,
  registerAdminSchema,
};

