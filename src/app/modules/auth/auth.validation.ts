import { z } from "zod";

const authLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string(),
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

export const authValidation = {
  authLoginSchema,
  loginSchema,
};
