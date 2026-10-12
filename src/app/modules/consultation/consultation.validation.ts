import z from "zod";

const consultationSchema = z.object({
  consultationMode: z.enum(["PHONE", "TEAMS"]),
  consultationType: z.enum(["THIRTY_MINUTES", "ONE_HOUR"]),
  paymentMethodId: z.string().min(1, "Payment method ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/),
});

const consultationFeesSchema = z.object({
  phoneThirtyMinutesFee: z.number().positive().optional(),
  phoneOneHourFee: z.number().positive().optional(),
  teamsThirtyMinutesFee: z.number().positive().optional(),
  teamsOneHourFee: z.number().positive().optional(),
});

export const consultationValidation = {
  consultationSchema,
  consultationFeesSchema,
};
