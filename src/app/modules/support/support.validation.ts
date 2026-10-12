import { z } from "zod";

const supportCreateValidationSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export const supportValidation = {
  supportCreateValidationSchema,
};
