import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1, "Token is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerOrganizationMemberSchema = z.object({
  token: z.string().min(1, "Token is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const organizationMemberSchema = z.object({
  organizationId: z.string().optional(),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required").trim(),
  role: z.string().min(1, "Role is required"),
  status: z.string().optional(),
});

const inviteUserSchema = z.object({
  organizationId: z.string().optional(),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required").trim(),
  role: z.string().min(1, "Role is required"),
});

export const organizationValidation = {
  registerSchema,
  organizationMemberSchema,
  registerOrganizationMemberSchema,
  inviteUserSchema,
};
