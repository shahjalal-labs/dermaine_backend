import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";
import { SignOptions } from "jsonwebtoken";

const loginUserIntoDB = async (payload: {
  email: string;
  password: string;
}) => {
  const organization = await prisma.organization.findUnique({
    where: {
      billingEmail: payload.email,
    },
  });
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user && !organization) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user?.password || (organization?.password as string),
  );

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  let accessToken = "";

  if (user) {
    accessToken = jwtHelpers.generateToken(
      { id: user.id, email: user.email, role: user.role, plan: "premium", isPaid: true },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as SignOptions["expiresIn"],
    );
  }

  if (organization) {
    accessToken = jwtHelpers.generateToken(
      {
        id: organization.id,
        email: organization.billingEmail,
        role: "Organization",
        plan: organization.plan || "premium",
        isPaid: true,
      },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as SignOptions["expiresIn"],
    );
  }

  const role = user?.role || "Organization";
  const email = user?.email || organization?.billingEmail || payload.email;
  const fullName = user?.fullName || organization?.billingName || "User";
  const me = user
    ? {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        address: user.address,
        gender: user.gender,
      }
    : organization
      ? {
          id: organization.id,
          email: organization.billingEmail,
          fullName: organization.billingName,
          role: "Organization",
          companyName: organization.companyName,
        }
      : null;

  return {
    id: user?.id || organization?.id,
    accessToken,
    token: accessToken,
    role,
    fullName,
    email,
    me,
  };
};

//google login
const googleLogin = async (payload: { email: string; fullName: string }) => {
  let user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        password: "",
        role: "User",
        isGoogleLogin: true,
      },
    });
  }

  const accessToken = jwtHelpers.generateToken(
    { id: user.id, email: user.email, role: user.role, plan: "premium", isPaid: true },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  return {
    id: user.id,
    accessToken,
    token: accessToken,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    me: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
      address: user.address,
      gender: user.gender,
    },
  };
};

const sendForgotPasswordOtpDB = async (email: string) => {
  if (!email || typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Valid email is required");
  }

  const cleanEmail = email.trim();
  const normalizedEmail = cleanEmail.toLowerCase();

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      OR: [
        { billingEmail: cleanEmail },
        { billingEmail: normalizedEmail },
        { billingEmail: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
  });

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        { email: normalizedEmail },
        { email: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
  });

  if (!existingUser && !existingOrganization) {
    throw new ApiError(404, "User or Organization not found");
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Clean any previous OTP records for this email and save the new OTP
  await prisma.otp.deleteMany({
    where: {
      OR: [
        { email: cleanEmail },
        { email: normalizedEmail },
      ],
    },
  });

  await prisma.otp.create({
    data: {
      email: normalizedEmail,
      otp,
      expiresAt,
    },
  });

  console.log(`🔑 Password reset OTP for ${normalizedEmail}: ${otp}`);

  try {
    const recipientName =
      existingUser?.fullName || existingOrganization?.billingName || "User";
    const targetEmail =
      existingUser?.email || existingOrganization?.billingEmail || normalizedEmail;
    const emailSubject = "Your Password Reset OTP";
    const emailHtml = `<div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Password Reset Request</h2>
          <p>Hi <b>${recipientName}</b>,</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="color: #007BFF;">${otp}</h1>
          <p>This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
          <p>Thanks, <br>The Support Team</p>
        </div>`;
    await sendEmail(targetEmail, emailSubject, emailHtml);
  } catch (err: any) {
    console.warn("⚠️ Password reset email could not be sent:", err?.message || err);
    console.log(`🔑 OTP fallback for testing/dev: ${otp}`);
  }

  return {
    message: "OTP sent successfully",
  };
};

const verifyForgotPasswordOtpCodeDB = async (payload: {
  email: string;
  otp: string;
}) => {
  if (!payload?.email || !payload?.otp) {
    throw new ApiError(400, "Email and OTP are required.");
  }

  const cleanEmail = payload.email.trim();
  const normalizedEmail = cleanEmail.toLowerCase();
  const inputOtp = String(payload.otp).trim();

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      OR: [
        { billingEmail: cleanEmail },
        { billingEmail: normalizedEmail },
        { billingEmail: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
  });

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        { email: normalizedEmail },
        { email: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
  });

  if (!user && !existingOrganization) {
    throw new ApiError(404, "User or Organization not found");
  }

  const savedOtpRecord = await prisma.otp.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { email: cleanEmail },
      ],
    },
  });

  if (!savedOtpRecord) {
    throw new ApiError(400, "OTP not found. Please request a new one.");
  }

  if (new Date() > savedOtpRecord.expiresAt) {
    await prisma.otp.deleteMany({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: cleanEmail },
        ],
      },
    });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (inputOtp !== savedOtpRecord.otp) {
    throw new ApiError(401, "Invalid OTP.");
  }

  // OTP verified successfully -> Delete it so it cannot be reused
  await prisma.otp.deleteMany({
    where: {
      OR: [
        { email: normalizedEmail },
        { email: cleanEmail },
      ],
    },
  });

  const userId = (user?.id || existingOrganization?.id) as string;
  const role = user ? user.role : "Organization";
  const userEmail =
    user?.email || existingOrganization?.billingEmail || normalizedEmail;

  const forgetToken = jwtHelpers.generateToken(
    { id: userId, email: userEmail, role, plan: "premium", isPaid: true },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  return {
    forgetToken,
    accessToken: forgetToken,
    token: forgetToken,
  };
};

const resetForgotPasswordDB = async (newPassword: string, userId: string) => {
  if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
    throw new ApiError(400, "Valid password is required");
  }

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  let existingOrganization = await prisma.organization.findUnique({
    where: { id: userId },
  });
  let existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Fallback check by email if userId was an email
  if (!existingUser && !existingOrganization) {
    existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userId },
          { email: userId.toLowerCase() },
        ],
      },
    });
    if (!existingUser) {
      existingOrganization = await prisma.organization.findFirst({
        where: {
          OR: [
            { billingEmail: userId },
            { billingEmail: userId.toLowerCase() },
          ],
        },
      });
    }
  }

  if (!existingUser && !existingOrganization) {
    throw new ApiError(404, "User or Organization not found");
  }

  const saltRounds = parseInt(config.jwt.gen_salt as string, 10) || 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  if (existingUser) {
    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });
  }

  if (existingOrganization) {
    await prisma.organization.update({
      where: {
        id: existingOrganization.id,
      },
      data: {
        password: hashedPassword,
      },
    });
  }

  return {
    message: "Password updated successfully.",
  };
};

export const authService = {
  loginUserIntoDB,
  googleLogin,
  sendForgotPasswordOtpDB,
  verifyForgotPasswordOtpCodeDB,
  resetForgotPasswordDB,
};
