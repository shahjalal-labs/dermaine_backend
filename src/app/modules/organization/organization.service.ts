import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import prisma from "../../../shared/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { EmailTokenPayload } from "../admin/admin.service";
import { inviteOrganizationMemberEmailBody } from "../../../helpers/email.body";
import sendEmail from "../../../helpers/sendEmail";
import { Prisma, UserRole } from "@prisma/client";

const registerOrganization = async (payload: any) => {
  const decoded = jwt.verify(
    payload.token,
    config.jwt.jwt_secret as string,
  ) as EmailTokenPayload;

  if (!decoded.email || !decoded.role) {
    throw new ApiError(400, "Email or role not found in token");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      billingEmail: decoded.email,
    },
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  if (organization.isSetup || organization.token === null) {
    throw new ApiError(400, "Organization is already set up");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: decoded.email,
    },
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: {
        billingEmail: decoded.email,
      },
      data: {
        isSetup: true,
        token: null,
        password: hashedPassword,
        status: "Active",
      },
    });
  });

  return;
};

const createNewStaff = async (payload: any, authOrgId?: string | null) => {
  // Enforce the authenticated organization's ID
  const targetOrgId = authOrgId || payload.organizationId;

  if (!targetOrgId) {
    throw new ApiError(400, "Organization ID is required.");
  }

  const existingOrganization = await prisma.organization.findUnique({
    where: { id: targetOrgId },
  });

  if (!existingOrganization) {
    throw new ApiError(404, "Organization not found.");
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingMember) {
    throw new ApiError(400, "Member with this email already exists.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      email: payload.email,
      role: payload.role || "Consultant",
      fullName: payload.fullName,
      organization: existingOrganization.billingName || existingOrganization.companyName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  const member = await prisma.organizationMember.create({
    data: {
      email: payload.email,
      fullName: payload.fullName,
      role: (payload.role as UserRole) || UserRole.Consultant,
      status: payload.status || "Invited",
      organizationId: existingOrganization.id,
      token: accessToken,
    },
  });

  try {
    const subject = `You're Invited to Join as a ${payload.role || "Consultant"} in ${existingOrganization.companyName || existingOrganization.billingName}`;
    const html = inviteOrganizationMemberEmailBody(
      payload.fullName,
      payload.role || "Consultant",
      existingOrganization.companyName || existingOrganization.billingName,
      `http://localhost:3000/organization/register?token=${accessToken}`,
    );
    await sendEmail(payload.email, subject, html);
  } catch (err) {
    console.error("Failed to send invite email", err);
  }

  return member;
};

const registerMember = async (payload: any) => {
  const decoded = jwt.verify(
    payload.token,
    config.jwt.jwt_secret as string,
  ) as EmailTokenPayload;

  if (!decoded.email || !decoded.role) {
    throw new ApiError(400, "Email or role not found in token");
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      email: decoded.email,
    },
  });

  if (!member) {
    throw new ApiError(404, "Member not found");
  }

  if (member.isSetup || member.userId || member.token === null) {
    throw new ApiError(400, "Member is already set up, login to continue.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: decoded.email,
    },
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: decoded.email,
        role: decoded.role,
        fullName: member.fullName,
        password: hashedPassword,
        organizationId: member.organizationId,
      },
    });

    await tx.organizationMember.update({
      where: {
        email: decoded.email,
      },
      data: {
        isSetup: true,
        token: null,
        userId: user.id,
        status: "Active",
      },
    });
  });

  return;
};

// Helper to get all applicant / user IDs and emails belonging to an organization
const getOrganizationUserIdentifiers = async (organizationId: string) => {
  const orgUsers = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, email: true },
  });

  const orgMembers = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { email: true, userId: true },
  });

  const ids = new Set<string>();
  orgUsers.forEach((u) => {
    ids.add(u.id);
    ids.add(u.email);
  });
  orgMembers.forEach((m) => {
    if (m.userId) ids.add(m.userId);
    ids.add(m.email);
  });

  return Array.from(ids);
};

// ============================================================
// STRICT MULTI-TENANT DASHBOARD SERVICES
// ============================================================

const getDashboardOverview = async (organizationId?: string | null) => {
  if (!organizationId) {
    return {
      metrics: {
        totalAssessments: 0,
        assessmentsCompleted: 0,
        reportsGenerated: 0,
        reportsCompleted: 0,
        consultations: 0,
        consultationsConfirmed: 0,
        revenueCAD: 0,
        revenuePaymentsCount: 0,
      },
      recentActivities: [],
      plan: {
        name: "Pro Plan",
        status: "ACTIVE",
        maxUsers: 50,
        maxAssessments: 500,
        maxReports: 500,
      },
    };
  }

  const orgIdentifiers = await getOrganizationUserIdentifiers(organizationId);

  // Assessments count only for this organization's users
  const totalAssessments = await prisma.assessmentSubmission.count({
    where: { applicantId: { in: orgIdentifiers } },
  });
  const assessmentsCompleted = await prisma.assessmentSubmission.count({
    where: {
      applicantId: { in: orgIdentifiers },
      status: "COMPLETED",
    },
  });

  // Reports count only for this organization's users
  const reportsGenerated = await prisma.streamEvaluationResult.count({
    where: { applicantId: { in: orgIdentifiers } },
  });
  const reportsCompleted = reportsGenerated;

  // Consultations only for this organization's users
  const consultations = await prisma.consultation.count({
    where: { user: { organizationId } },
  });
  const consultationsConfirmed = await prisma.consultation.count({
    where: {
      user: { organizationId },
      status: "CONFIRMED",
    },
  });

  // Revenue & Payments strictly from this organization's consultations
  const consultationsWithPayment = await prisma.consultation.findMany({
    where: { user: { organizationId }, amountPaid: { gt: 0 } },
    select: { amountPaid: true },
  });
  const revenueCAD = consultationsWithPayment.reduce(
    (acc, curr) => acc + (curr.amountPaid || 0),
    0,
  );
  const revenuePaymentsCount = consultationsWithPayment.length;

  // Recent Activities strictly for this organization
  const recentSubmissions = await prisma.assessmentSubmission.findMany({
    where: { applicantId: { in: orgIdentifiers } },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { assesment: { select: { title: true } } },
  });

  const recentActivities = recentSubmissions.map((sub) => ({
    title: sub.assesment?.title || "Assessment Permanent Residence",
    date: sub.submittedAt
      ? new Date(sub.submittedAt).toLocaleDateString()
      : new Date(sub.createdAt).toLocaleDateString(),
    status: sub.status || "COMPLETED",
  }));

  // Organization Plan Info strictly for this organization
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  return {
    metrics: {
      totalAssessments: totalAssessments || 0,
      assessmentsCompleted: assessmentsCompleted || 0,
      reportsGenerated: reportsGenerated || 0,
      reportsCompleted: reportsCompleted || 0,
      consultations: consultations || 0,
      consultationsConfirmed: consultationsConfirmed || 0,
      revenueCAD: revenueCAD || 0,
      revenuePaymentsCount: revenuePaymentsCount || 0,
    },
    recentActivities: recentActivities,
    plan: {
      name: organization?.plan || "Pro Plan",
      status: organization?.status || "ACTIVE",
      maxUsers: organization?.maxUsers || 50,
      maxAssessments: organization?.maxAssessments || 500,
      maxReports: organization?.maxReports || 500,
    },
  };
};

const getOrganizationUsers = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  if (!organizationId) {
    return {
      meta: { page, limit, total: 0, totalPages: 1 },
      users: [],
    };
  }

  const whereCondition: Prisma.UserWhereInput = {
    organizationId,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const users = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { companyName: true, billingName: true } } },
  });

  const total = await prisma.user.count({ where: whereCondition });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    organization: u.organization?.companyName || u.organization?.billingName || "My Organization",
    role: u.role,
    status: u.status,
    invitedDate: "--",
    lastActive: new Date(u.updatedAt).toLocaleDateString(),
  }));

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    users: formattedUsers,
  };
};

const getOrganizationMembers = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  if (!organizationId) {
    return {
      meta: { page, limit, total: 0, totalPages: 1 },
      members: [],
    };
  }

  const whereCondition: Prisma.OrganizationMemberWhereInput = {
    organizationId,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const members = await prisma.organizationMember.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { companyName: true, billingName: true } },
      user: { select: { updatedAt: true } },
    },
  });

  const total = await prisma.organizationMember.count({ where: whereCondition });

  const formattedMembers = members.map((m) => ({
    id: m.id,
    name: m.fullName,
    email: m.email,
    organization: m.organization?.companyName || m.organization?.billingName || "My Organization",
    role: m.role,
    status: m.status,
    invitedDate: m.status === "Invited" ? new Date(m.createdAt).toLocaleDateString() : "--",
    lastActive: m.user?.updatedAt
      ? new Date(m.user.updatedAt).toLocaleDateString()
      : "--",
  }));

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    members: formattedMembers,
  };
};

const getOrganizationApplicants = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  if (!organizationId) {
    return { meta: { page, limit, total: 0, totalPages: 1 }, applicants: [] };
  }

  const orgIdentifiers = await getOrganizationUserIdentifiers(organizationId);

  const whereCondition: Prisma.AssessmentSubmissionWhereInput = {
    applicantId: { in: orgIdentifiers },
    ...(status && status !== "All Statuses" && {
      status: status === "Completed" ? "COMPLETED" : "IN_PROGRESS",
    }),
    ...(search && {
      applicantId: { contains: search, mode: "insensitive" },
    }),
  };

  const submissions = await prisma.assessmentSubmission.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { assesment: { select: { title: true, assessmentType: true } } },
  });

  const total = await prisma.assessmentSubmission.count({ where: whereCondition });

  const formattedApplicants = submissions.map((sub) => ({
    id: sub.id,
    applicantId: sub.applicantId || sub.id,
    assessmentsCount: 1,
    assessmentTypes: [
      sub.assesment?.title || "Permanent Residence",
    ],
    latestActivity: sub.submittedAt
      ? new Date(sub.submittedAt).toLocaleDateString()
      : new Date(sub.createdAt).toLocaleDateString(),
    status: sub.status === "COMPLETED" ? "Completed" : "In Progress",
  }));

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    applicants: formattedApplicants,
  };
};

const getOrganizationAssessments = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
  type?: string,
  status?: string,
) => {
  if (!organizationId) {
    return { meta: { page, limit, total: 0, totalPages: 1 }, assessments: [] };
  }

  const orgIdentifiers = await getOrganizationUserIdentifiers(organizationId);

  const whereCondition: Prisma.AssessmentSubmissionWhereInput = {
    applicantId: { in: orgIdentifiers },
    ...(status && status !== "All Statuses" && {
      status: status === "Completed" ? "COMPLETED" : "IN_PROGRESS",
    }),
  };

  const submissions = await prisma.assessmentSubmission.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { assesment: { select: { title: true } } },
  });

  const total = await prisma.assessmentSubmission.count({ where: whereCondition });

  const formatted = submissions.map((sub) => ({
    id: sub.id,
    userId: sub.applicantId || sub.id,
    type: sub.assesment?.title || "Permanent Residence",
    status: sub.status === "COMPLETED" ? "Completed" : "In Progress",
    score: 85,
    reportPurchased: "No",
    date: new Date(sub.createdAt).toLocaleDateString(),
  }));

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    assessments: formatted,
  };
};

const getOrganizationReports = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  if (!organizationId) {
    return { meta: { page, limit, total: 0, totalPages: 1 }, reports: [] };
  }

  const orgIdentifiers = await getOrganizationUserIdentifiers(organizationId);

  const whereCondition: Prisma.StreamEvaluationResultWhereInput = {
    applicantId: { in: orgIdentifiers },
  };

  const evaluations = await prisma.streamEvaluationResult.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { stream: { select: { streamName: true } } },
  });

  const total = await prisma.streamEvaluationResult.count({ where: whereCondition });

  const formatted = evaluations.map((ev: any) => ({
    id: ev.id,
    userId: ev.applicantId || ev.id,
    type: ev.stream?.streamName || "Permanent Residence",
    status: "Completed",
    overallScore: Math.round(ev.matchScore) || 85,
    programsMatched: "3 Programs",
    date: new Date(ev.createdAt).toLocaleDateString(),
  }));

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    reports: formatted,
  };
};

const getOrganizationConsultations = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  if (!organizationId) {
    return { meta: { page, limit, total: 0, totalPages: 1 }, consultations: [] };
  }

  const whereCondition: Prisma.ConsultationWhereInput = {
    user: { organizationId },
  };

  const consultations = await prisma.consultation.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  const total = await prisma.consultation.count({ where: whereCondition });

  const formatted = consultations.map((c) => ({
    id: c.id,
    userId: c.userId,
    type: c.consultationType === "THIRTY_MINUTES" ? "30 Minutes" : "60 Minutes",
    status: c.status === "CONFIRMED" ? "Confirmed" : c.status === "CANCELLED" ? "cancelled" : "Pending",
    date: new Date(c.scheduledAt).toISOString().split("T")[0],
    time: new Date(c.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    consultant: c.user?.fullName || "--",
    payment: c.amountPaid ? "Paid" : "Unpaid",
  }));

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    consultations: formatted,
  };
};

const getOrganizationPayments = async (
  organizationId?: string | null,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  if (!organizationId) {
    return {
      meta: { page, limit, total: 0, totalPages: 1 },
      totalFilteredRevenue: 0,
      payments: [],
    };
  }

  const whereCondition: Prisma.ConsultationWhereInput = {
    user: { organizationId },
    amountPaid: { gt: 0 },
  };

  const consultations = await prisma.consultation.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.consultation.count({ where: whereCondition });

  const formatted = consultations.map((c, idx) => ({
    id: c.id,
    invoice: `INV${124578 + idx}`,
    userId: c.userId,
    product: c.consultationType === "THIRTY_MINUTES" ? "Consultation 30" : "Consultation 60",
    amount: c.amountPaid || 0,
    currency: "CAD",
    status: "Completed",
    date: new Date(c.createdAt).toLocaleDateString(),
  }));

  const totalFilteredRevenue = formatted
    .filter((p) => p.status === "Completed")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    totalFilteredRevenue,
    payments: formatted,
  };
};

export const organizationService = {
  createNewStaff,
  registerMember,
  registerOrganization,
  getDashboardOverview,
  getOrganizationUsers,
  getOrganizationMembers,
  getOrganizationApplicants,
  getOrganizationAssessments,
  getOrganizationReports,
  getOrganizationConsultations,
  getOrganizationPayments,
};
