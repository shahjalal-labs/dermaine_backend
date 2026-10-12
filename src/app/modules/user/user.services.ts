import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import { Request } from "express";
import { uploadInSpace } from "../../../helpers/uploadInSpace";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";

const createNewAccount = async (payload: {
  email: string;
  password: string;
  fullName: string;
  slug?: string;
}) => {
  const { email, password, fullName, slug } = payload;
  const cleanEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { email: cleanEmail },
      ],
    },
  });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email.");
  }

  let organizationId = null;

  if (slug) {
    const existingOrganization = await prisma.organization.findUnique({
      where: { slug },
    });
    organizationId = existingOrganization?.id;
  }

  if (!organizationId) {
    const defaultOrganization = await prisma.organization.findFirst({
      where: { slug: "default-organization" },
    });
    organizationId = defaultOrganization?.id;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    parseInt(config.jwt.gen_salt as string, 10),
  );

  const newUser = await prisma.user.create({
    data: {
      email: cleanEmail,
      password: hashedPassword,
      fullName,
      role: "User",
      organizationId,
    },
  });

  // Generate and store OTP for email verification
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otp.deleteMany({
    where: {
      OR: [{ email }, { email: cleanEmail }],
    },
  });

  await prisma.otp.create({
    data: {
      email: cleanEmail,
      otp,
      expiresAt,
    },
  });

  console.log(`🔑 Verification OTP for new account ${cleanEmail}: ${otp}`);

  try {
    const emailSubject = "Verify Your Account - Immica";
    const emailHtml = `<div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Welcome to Immica!</h2>
          <p>Hi <b>${fullName}</b>,</p>
          <p>Your verification code is:</p>
          <h1 style="color: #007BFF;">${otp}</h1>
          <p>This code is valid for <b>10 minutes</b>.</p>
        </div>`;
    await sendEmail(cleanEmail, emailSubject, emailHtml);
  } catch (err: any) {
    console.warn("⚠️ Account verification email could not be sent:", err?.message || err);
  }

  return {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    message: "User account created successfully.",
  };
};

const getMyProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      gender: true,
      address: true,
      role: true,
      status: true,
      organizationId: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new ApiError(404, "User not found");

  return {
    ...user,
    fullname: user.fullName,
    phone: user.phoneNumber,
    profileimage: user.profileImage,
  };
};

const updateProfileIntoDB = async (req: Request) => {
  const userId = req.user.id;
  const userData = req.body;
  const file = req.file as Express.Multer.File | undefined;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found for edit");

  let profileImage = user.profileImage;
  if (file) {
    profileImage = await uploadInSpace(file, "users/profileImage");
  }

  const updateData: any = {};
  if (userData.fullName !== undefined) updateData.fullName = userData.fullName;
  if (userData.fullname !== undefined && userData.fullName === undefined) updateData.fullName = userData.fullname;
  if (userData.phoneNumber !== undefined) updateData.phoneNumber = userData.phoneNumber;
  if (userData.phone !== undefined && userData.phoneNumber === undefined) updateData.phoneNumber = userData.phone;
  if (userData.address !== undefined) updateData.address = userData.address;
  if (userData.gender !== undefined) updateData.gender = userData.gender;
  if (file) updateData.profileImage = profileImage;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      gender: true,
      address: true,
      role: true,
      status: true,
      organizationId: true,
      profileImage: true,
      updatedAt: true,
    },
  });

  return {
    ...updatedUser,
    fullname: updatedUser.fullName,
    phone: updatedUser.phoneNumber,
    profileimage: updatedUser.profileImage,
  };
};

const changePassword = async (
  newPassword: string,
  userId: string,
  oldPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordValid) throw new ApiError(401, "Wrong old password");

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt),
  );

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });
  return;
};

const deleteAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });
  return;
};

const getAllUsersFromDB = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: UserStatus,
) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: UserRole.User,
    ...(status && { status }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where: whereCondition }),
    prisma.user.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
        status: true,
        role: true,
        gender: true,
        phoneNumber: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const userIds = users.map((u) => u.id);
  const evaluationResults = await prisma.streamEvaluationResult.findMany({
    where: { applicantId: { in: userIds } },
    select: {
      applicantId: true,
      matchScore: true,
      streamId: true,
      eligibilityStatus: true,
    },
  });

  const evaluationsByUser: Record<
    string,
    { maxScore: number; matchedProgramsCount: number }
  > = {};

  evaluationResults.forEach((evalResult) => {
    const uid = evalResult.applicantId;
    if (!evaluationsByUser[uid]) {
      evaluationsByUser[uid] = { maxScore: evalResult.matchScore || 0, matchedProgramsCount: 0 };
    }
    if (evalResult.matchScore > evaluationsByUser[uid].maxScore) {
      evaluationsByUser[uid].maxScore = evalResult.matchScore;
    }
    if (
      evalResult.eligibilityStatus !== "NOT_ELIGIBLE" &&
      evalResult.eligibilityStatus !== "Not Eligible Yet"
    ) {
      evaluationsByUser[uid].matchedProgramsCount += 1;
    }
  });

  const items = users.map((user) => {
    const evalData = evaluationsByUser[user.id];
    const scoreVal = evalData ? Math.round(evalData.maxScore) : 0;
    const matchedVal = evalData ? evalData.matchedProgramsCount : 0;
    return {
      ...user,
      score: String(scoreVal),
      assessmentScore: scoreVal,
      matchedPrograms: String(matchedVal),
      joined: new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });

  return {
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    users: items,
    items,
  };
};

const updateUserStatus = async (userId: string, status: UserStatus) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
    },
  });
};

export const userService = {
  createNewAccount,
  getMyProfileFromDB,
  updateProfileIntoDB,
  changePassword,
  deleteAccount,
  getAllUsersFromDB,
  updateUserStatus,
};
