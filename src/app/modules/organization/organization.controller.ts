import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { organizationService } from "./organization.service";
import prisma from "../../../shared/prisma";

// Helper to reliably extract the active organizationId from req.user
const resolveOrganizationId = async (req: any): Promise<string | null> => {
  const user = req.user;
  if (!user) return null;

  // 1. Direct Organization login (token payload id is organization.id)
  if (user.role === "Organization") {
    return user.id;
  }

  // 2. User/Staff login: retrieve organizationId from User table
  if (user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId) {
      return dbUser.organizationId;
    }
  }

  // 3. Fallback to organizationMember table
  if (user.email) {
    const dbMember = await prisma.organizationMember.findUnique({
      where: { email: user.email },
      select: { organizationId: true },
    });
    if (dbMember?.organizationId) {
      return dbMember.organizationId;
    }
  }

  // 4. SuperAdmin or explicit query param override
  if ((user.role === "SuperAdmin" || user.role === "Admin") && req.query.organizationId) {
    return req.query.organizationId as string;
  }

  return user.organizationId || null;
};

const registerOrganization = catchAsync(async (req, res) => {
  await organizationService.registerOrganization(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization registered successfully.",
  });
});

const createNewStaff = catchAsync(async (req, res) => {
  const orgId = await resolveOrganizationId(req);
  const result = await organizationService.createNewStaff(req.body, orgId);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Staff member created successfully.",
    data: result,
  });
});

const registerMember = catchAsync(async (req, res) => {
  await organizationService.registerMember(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Member registered successfully.",
  });
});

const getDashboardOverview = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const result = await organizationService.getDashboardOverview(organizationId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard overview fetched successfully.",
    data: result,
  });
});

const cleanSearchParam = (val: any): string | undefined => {
  if (!val || val === "undefined" || val === "null" || !String(val).trim()) return undefined;
  return String(val).trim();
};

const getOrganizationUsers = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const result = await organizationService.getOrganizationUsers(organizationId, page, limit, search);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization users fetched successfully.",
    data: result,
  });
});

const getOrganizationMembers = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const result = await organizationService.getOrganizationMembers(organizationId, page, limit, search);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization members fetched successfully.",
    data: result,
  });
});

const getOrganizationApplicants = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const status = req.query.status as string;
  const result = await organizationService.getOrganizationApplicants(organizationId, page, limit, search, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization applicants fetched successfully.",
    data: result,
  });
});

const getOrganizationAssessments = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const type = req.query.type as string;
  const status = req.query.status as string;
  const result = await organizationService.getOrganizationAssessments(organizationId, page, limit, search, type, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization assessments fetched successfully.",
    data: result,
  });
});

const getOrganizationReports = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const status = req.query.status as string;
  const result = await organizationService.getOrganizationReports(organizationId, page, limit, search, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization reports fetched successfully.",
    data: result,
  });
});

const getOrganizationConsultations = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const status = req.query.status as string;
  const result = await organizationService.getOrganizationConsultations(organizationId, page, limit, search, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization consultations fetched successfully.",
    data: result,
  });
});

const getOrganizationPayments = catchAsync(async (req, res) => {
  const organizationId = await resolveOrganizationId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = cleanSearchParam(req.query.search);
  const status = req.query.status as string;
  const result = await organizationService.getOrganizationPayments(organizationId, page, limit, search, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organization payments fetched successfully.",
    data: result,
  });
});

export const organizationController = {
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
