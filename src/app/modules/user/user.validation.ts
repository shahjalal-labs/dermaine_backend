import { z } from "zod";

const userRegisterValidationSchema = z.object({
  fullName: z.string().min(1, "Full name must be at least 1 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});
const userChangePasswordValidationSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});

export const userValidation = {
  userRegisterValidationSchema,
  userChangePasswordValidationSchema,
};
