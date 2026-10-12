import { z } from "zod";

const createProgramValidationSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .trim()
    .min(1, "Name cannot be empty"),
  category: z.string().trim().optional(),
});

const updateProgramValidationSchema = createProgramValidationSchema.partial();

export const programValidation = {
  createProgramValidationSchema,
  updateProgramValidationSchema,
};
