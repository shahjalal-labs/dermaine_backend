import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import jwt, { JwtPayload } from "jsonwebtoken";
import { QuestionInputType, RuleOperator, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import sendEmail from "../../../helpers/sendEmail";
import {
  inviteAdminEmailBody,
  inviteOrganizationEmailBody,
} from "../../../helpers/email.body";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import {
  submissionService,
  SubmitAssessmentInput,
} from "../matchEngine/submissionEngine/submissionEngine";

export interface EmailTokenPayload extends JwtPayload {
  email: string;
  role: UserRole;
}

export interface CreateQuestionOption {
  label: string;
  value: string;
}

export interface CreateQuestionInput {
  assesmentId: string;
  questionId: string;
  questionText: string;
  inputType: QuestionInputType;
  questionType: string;
  isCountry?: boolean;
  order?: number;
  options?: CreateQuestionOption[];
  isOptional?: boolean;
  // grouping / repeatable sections
  groupId?: string;

  // conditional visibility
  dependsOnQuestionId?: string;
  dependsOnOperator?: RuleOperator;
  dependsOnValue?: string;
}

const SELECTABLE_TYPES: QuestionInputType[] = [
  QuestionInputType.SELECT,
  QuestionInputType.MULTI_SELECT,
];

const VALUELESS_OPERATORS: RuleOperator[] = [
  RuleOperator.IS_TRUE,
  RuleOperator.IS_FALSE,
  RuleOperator.IS_EMPTY,
  RuleOperator.IS_NOT_EMPTY,
];

const createNewQuestion = async (payload: CreateQuestionInput) => {
  await prisma.assesment.findUniqueOrThrow({
    where: { id: payload.assesmentId },
    select: { id: true },
  });

  const {
    assesmentId,
    options,
    isCountry,
    groupId,
    dependsOnQuestionId,
    dependsOnOperator,
    dependsOnValue,
    ...rest
  } = payload;

  const { inputType } = payload;
  const isSelectableType = SELECTABLE_TYPES.includes(inputType);
  const hasOptions = !!options && options.length > 0;

  // ---------------------------------------------------------
  // isCountry validation
  // ---------------------------------------------------------
  if (isCountry && !isSelectableType) {
    throw new Error(
      "isCountry can only be set on SELECT or MULTI_SELECT questions.",
    );
  }

  if (isSelectableType) {
    if (isCountry && hasOptions) {
      throw new Error(
        "Provide either options or isCountry for a SELECT/MULTI_SELECT question, not both.",
      );
    }
    if (!isCountry && !hasOptions) {
      throw new Error(
        "SELECT/MULTI_SELECT questions require either options or isCountry to be true.",
      );
    }
  } else if (hasOptions) {
    throw new Error(
      `options cannot be set on a question of type "${inputType}".`,
    );
  }

  // ---------------------------------------------------------
  // groupId validation
  // ---------------------------------------------------------
  let group: { id: string; isRepeatable: boolean } | null = null;

  if (groupId) {
    group = await prisma.questionGroup.findUnique({
      where: { id: groupId },
      select: { id: true, assesmentId: true, isRepeatable: true },
    });

    if (!group) {
      throw new Error(`groupId "${groupId}" does not exist.`);
    }

    if ((group as any).assesmentId !== assesmentId) {
      throw new Error(
        `groupId "${groupId}" belongs to a different assessment than this question.`,
      );
    }
  }

  // ---------------------------------------------------------
  // dependsOn validation
  // ---------------------------------------------------------
  const hasQuestionId =
    dependsOnQuestionId !== undefined && dependsOnQuestionId !== null;
  const hasOperator =
    dependsOnOperator !== undefined && dependsOnOperator !== null;
  const hasValue = dependsOnValue !== undefined && dependsOnValue !== null;
  const operatorNeedsValue =
    hasOperator && !VALUELESS_OPERATORS.includes(dependsOnOperator);

  if (hasQuestionId !== hasOperator) {
    throw new Error(
      "dependsOnQuestionId and dependsOnOperator must both be provided together, or not at all.",
    );
  }

  if (operatorNeedsValue && !hasValue) {
    throw new Error(
      `dependsOnValue is required when dependsOnOperator is "${dependsOnOperator}".`,
    );
  }

  if (!operatorNeedsValue && hasValue) {
    throw new Error(
      `dependsOnValue should not be set when dependsOnOperator is "${dependsOnOperator}".`,
    );
  }

  let parentQuestion: { id: string; assesmentId: string; groupId: string | null } | null = null;

  if (dependsOnQuestionId) {
    parentQuestion = await prisma.question.findUnique({
      where: { id: dependsOnQuestionId },
      select: { id: true, assesmentId: true, groupId: true },
    });

    if (!parentQuestion) {
      throw new Error(
        `dependsOnQuestionId "${dependsOnQuestionId}" does not exist.`,
      );
    }

    if (parentQuestion.assesmentId !== assesmentId) {
      throw new Error(
        `dependsOnQuestionId "${dependsOnQuestionId}" belongs to a different assessment than this question.`,
      );
    }

    // A question inside a repeatable group should only depend on a question
    // in the SAME group (so the dependency resolves per-instance), or on a
    // question outside any group entirely. Cross-group dependencies inside
    // repeatable sections are ambiguous (which instance would it point to?).
    if (group?.isRepeatable && parentQuestion.groupId && parentQuestion.groupId !== groupId) {
      throw new Error(
        `dependsOnQuestionId "${dependsOnQuestionId}" belongs to a different question group; a repeatable question can only depend on a question in the same group or one outside any group.`,
      );
    }
  }

  const question = await prisma.question.create({
    data: {
      ...rest,
      inputType,
      isCountry: !!isCountry,
      assesment: {
        connect: { id: assesmentId },
      },
      ...(groupId && {
        group: { connect: { id: groupId } },
      }),
      ...(dependsOnQuestionId && {
        dependsOnQuestion: { connect: { id: dependsOnQuestionId } },
        dependsOnOperator,
        dependsOnValue,
      }),
      ...(hasOptions
        ? {
            options: {
              create: options.map((opt) => ({
                label: opt.label,
                value: opt.value,
              })),
            },
          }
        : {}),
    },
    include: {
      options: true,
      group: true,
      dependsOnQuestion: {
        select: { id: true, questionId: true, questionText: true },
      },
    },
  });

  return question;
};

export interface CreateQuestionGroupInput {
  assesmentId: string;
  groupKey: string;
  title: string;
  isRepeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  order?: number;
}

const createQuestionGroup = async (payload: CreateQuestionGroupInput) => {
  await prisma.assesment.findUniqueOrThrow({
    where: { id: payload.assesmentId },
    select: { id: true },
  });

  const {
    assesmentId,
    groupKey,
    title,
    isRepeatable,
    minInstances,
    maxInstances,
    order,
  } = payload;

  if (!groupKey?.trim()) {
    throw new Error("groupKey is required.");
  }
  if (!title?.trim()) {
    throw new Error("title is required.");
  }
  if (
    minInstances !== undefined &&
    maxInstances !== undefined &&
    minInstances > maxInstances
  ) {
    throw new Error("minInstances cannot be greater than maxInstances.");
  }

  const existing = await prisma.questionGroup.findUnique({
    where: { assesmentId_groupKey: { assesmentId, groupKey } },
    select: { id: true },
  });
  if (existing) {
    throw new Error(
      `A group with groupKey "${groupKey}" already exists on this assessment.`,
    );
  }

  const group = await prisma.questionGroup.create({
    data: {
      groupKey,
      title,
      isRepeatable: !!isRepeatable,
      minInstances: minInstances ?? 0,
      maxInstances,
      order: order ?? 0,
      assesment: { connect: { id: assesmentId } },
    },
  });

  return group;
};



const createNewOrganization = async (payload: any) => {
  const existingOrganization = await prisma.organization.findUnique({
    where: {
      billingEmail: payload.billingEmail,
    },
  });

  if (existingOrganization) {
    throw new ApiError(
      400,
      "Organization with this billing email already exists.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.billingEmail,
    },
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      email: payload.billingEmail,
      role: "Organization",
      billingName: payload.billingName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  await prisma.organization.create({
    data: {
      ...payload,
      token: accessToken,
    },
  });

  const subject = `You're Invited to Set Up ${payload.billingName}`;
  const html = inviteOrganizationEmailBody(
    payload.billingName,
    `http://localhost:3000/organization/register?token=${accessToken}`,
  );

  try {
    await sendEmail(payload.billingEmail, subject, html);
  } catch (err: any) {
    console.warn("⚠️ sendEmail warning:", err?.message || err);
  }

  return `http://localhost:3000/organization/register?token=${accessToken}`;
};

const createAssessment = async (payload: any) => {
  const title = payload.title.trim();

  const existingAssessment = await prisma.assesment.findUnique({
    where: {
      title,
    },
  });

  if (existingAssessment) {
    throw new ApiError(400, "Assessment with this title already exists.");
  }

  const created = await prisma.assesment.create({
    data: {
      title,
      assessmentType: payload.assessmentType || title.toUpperCase().replace(/[-\s]+/g, "_"),
    },
  });

  return created;
};

const slugToAssessmentId: Record<string, string> = {
  "permanent-residence": "6a3512fa79dce42f4e5f4407",
  "study": "6a3512fa79dce42f4e5f4408",
  "work": "6a3512fa79dce42f4e5f4409",
  "family": "6a3512fa79dce42f4e5f440a",
  "study-permit": "6a3512fa79dce42f4e5f4408",
  "work-permit": "6a3512fa79dce42f4e5f4409",
  "family-sponsorship": "6a3512fa79dce42f4e5f440a",
};

const getAllAssessments = async (query?: { search?: string; page?: number; limit?: number }) => {
  const search = query?.search?.trim();
  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search && search !== "undefined" && search !== "null") {
    where.title = { contains: search, mode: "insensitive" };
  }

  const assessments = await prisma.assesment.findMany({
    where,
    take: limit,
    skip: skip,
    select: {
      id: true,
      title: true,
      assessmentType: true,
      _count: {
        select: {
          questions: true,
          questionGroups: true,
        },
      },
    },
  });
  return assessments;
};

const assesmentWiseQuestionsFromDB = async (assesmentId: string) => {
  let resolvedId = assesmentId;
  if (slugToAssessmentId[assesmentId]) {
    resolvedId = slugToAssessmentId[assesmentId];
  } else if (!/^[0-9a-fA-F]{24}$/.test(assesmentId)) {
    const found = await prisma.assesment.findFirst({
      where: {
        OR: [
          { title: { equals: assesmentId, mode: "insensitive" } },
        ],
      },
    });
    if (found) resolvedId = found.id;
  }

  const [assesment, groups] = await Promise.all([
    prisma.assesment.findUniqueOrThrow({
      where: { id: resolvedId },
      select: {
        id: true,
        title: true,
        assessmentType: true,
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { id: "asc" } },
            group: true,
            dependsOnQuestion: {
              select: { id: true, questionId: true, questionText: true },
            },
          },
        },
      },
    }),
    prisma.questionGroup.findMany({
      where: { assesmentId: resolvedId },
      orderBy: { order: "asc" },
    }),
  ]);

  return { ...assesment, groups };
};

const getGetQuestionTypeWise = async (questionType: string) => {
  if (!questionType) {
    throw new ApiError(400, "questionType is required");
  }

  const clean = questionType.trim();
  const normalized = clean.toUpperCase().replace(/[-\s]+/g, "_");

  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { questionType: clean },
        { questionType: normalized },
        { questionType: { equals: clean, mode: "insensitive" } },
        { questionType: { equals: normalized, mode: "insensitive" } },
      ],
    },
    include: { options: true },
  });
  return questions;
};

const deleteQuestion = async (questionId: string) => {
  await prisma.question.delete({
    where: { id: questionId },
  });
};

export interface UpdateQuestionInput {
  questionText?: string;
  questionType?: string;
  inputType?: QuestionInputType;
  order?: number;
  isOptional?: boolean;
  isCountry?: boolean;
  helpText?: string | null;
  groupId?: string | null;
  dependsOnQuestionId?: string | null;
  dependsOnOperator?: RuleOperator | null;
  dependsOnValue?: string | null;
  options?: CreateQuestionOption[];
}

const updateQuestion = async (id: string, payload: UpdateQuestionInput) => {
  await prisma.question.findUniqueOrThrow({
    where: { id },
    select: { id: true },
  });

  const { options, ...rest } = payload;

  const updated = await prisma.$transaction(async (tx) => {
    if (options !== undefined) {
      await tx.questionOption.deleteMany({
        where: { questionId: id },
      });
      if (options.length > 0) {
        await tx.questionOption.createMany({
          data: options.map((opt) => ({
            questionId: id,
            label: opt.label,
            value: opt.value,
          })),
        });
      }
    }

    return await tx.question.update({
      where: { id },
      data: rest as Prisma.QuestionUpdateInput,
      include: { options: true },
    });
  });

  return updated;
};

const bulkCreateQuestions = async (payload: any) => {
  const { assesmentId, questions } = payload;

  // make sure the assessment exists, and grab existing questionIds for dupe checking
  const assesment = await prisma.assesment.findUniqueOrThrow({
    where: { id: assesmentId },
    select: {
      id: true,
      questions: { select: { questionId: true } },
    },
  });

  const existingIds = new Set(assesment.questions.map((q) => q.questionId));
  const incomingIds = questions.map((q: any) => q.questionId);

  // reject if incoming batch has duplicate questionIds among themselves
  const seen = new Set<string>();
  const duplicatesInPayload = incomingIds.filter((id: any) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });

  if (duplicatesInPayload.length > 0) {
    throw new Error(
      `Duplicate questionId(s) in payload: ${[...new Set(duplicatesInPayload)].join(", ")}`,
    );
  }

  // reject if any incoming questionId already exists on this assessment
  const conflicts = incomingIds.filter((id: any) => existingIds.has(id));
  if (conflicts.length > 0) {
    throw new Error(
      `questionId(s) already exist for this assessment: ${conflicts.join(", ")}`,
    );
  }

  const createdQuestions = await prisma.$transaction(
    questions.map((q: any) => {
      const { options, ...rest } = q;
      return prisma.question.create({
        data: {
          ...rest,
          assesment: { connect: { id: assesmentId } },
          ...(options?.length ? { options: { create: options } } : {}),
        },
        include: { options: true },
      });
    }),
  );

  return createdQuestions;
};

const createNewAdmin = async (payload: any) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new ApiError(400, "Email already in use by another user.");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      email: payload.email,
      role: "Admin",
      adminName: payload.adminName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  await prisma.pendingAdmin.upsert({
    where: { email: payload.email },
    update: { token: accessToken },
    create: {
      ...payload,
      token: accessToken,
    },
  });

  const subject = `You're Invited to Set Up ${payload.adminName}`;
  const html = inviteAdminEmailBody(
    payload.adminName,
    `http://206.162.244.144:3104/admin/register?token=${accessToken}`,
  );

  try {
    await sendEmail(payload.email, subject, html);
  } catch (err: any) {
    console.warn("⚠️ sendEmail warning:", err?.message || err);
  }

  return `http://206.162.244.144:3104/admin/register?token=${accessToken}`;
};

const registerAdmin = async (payload: any) => {
  const decoded = jwt.verify(
    payload.token,
    config.jwt.jwt_secret as string,
  ) as EmailTokenPayload;

  if (!decoded.email || !decoded.role) {
    throw new ApiError(400, "Email or role not found in token");
  }

  const pendingAdmin = await prisma.pendingAdmin.findUnique({
    where: {
      email: decoded.email,
    },
  });

  if (!pendingAdmin) {
    throw new ApiError(404, "Pending admin not found");
  }

  if (pendingAdmin.token === null) {
    throw new ApiError(400, "Admin is already set up, login to continue.");
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
    await tx.user.create({
      data: {
        email: decoded.email,
        role: decoded.role,
        fullName: pendingAdmin.adminName,
        password: hashedPassword,
      },
    });

    await tx.pendingAdmin.delete({
      where: {
        id: pendingAdmin.id,
      },
    });
  });

  return;
};

const getAllAdminsFromDB = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "Admin",
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalAdmins = await prisma.user.count({
    where: { role: "Admin" },
  });

  const filteredUsersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredUsersCount / limit);

  const admins = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fullName: true,
      status: true,
      profileImage: true,
      email: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      total: totalAdmins,
      totalAdmins,
      totalPages,
      currentPage: page,
      limit,
    },
    admins,
  };
};

const getAllOrganizationsFromDB = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  const whereCondition: Prisma.OrganizationWhereInput = {
    billingEmail: { not: "default@gmail.com" },
    ...(search && {
      OR: [
        { billingName: { contains: search, mode: "insensitive" } },
        { billingEmail: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status && {
      status: {
        equals: status as string,
      },
    }),
  };

  const totalOrganizations = await prisma.organization.count();
  const totalActive = await prisma.organization.count({
    where: { status: "Active" },
  });
  const totalTrial = await prisma.organization.count({
    where: { plan: "Trial" },
  });
  const totalSuspended = await prisma.organization.count({
    where: { status: "Suspended" },
  });

  const filteredOrganizationsCount = await prisma.organization.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredOrganizationsCount / limit);

  const organizations = await prisma.organization.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      billingName: true,
      billingEmail: true,
      maxUsers: true,
      plan: true,
      type: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      total: totalOrganizations,
      totalOrganizations,
      totalActive,
      totalTrial,
      totalSuspended,
      totalPages,
      currentPage: page,
      limit,
    },
    stats: [
      { label: "Total Organizations", value: String(totalOrganizations), color: "text-title" },
      { label: "Active", value: String(totalActive), color: "text-[#16851f]" },
      { label: "Trial", value: String(totalTrial), color: "text-[#0088ff]" },
      { label: "Suspended", value: String(totalSuspended), color: "text-[#f8cb2e]" },
    ],
    organizations,
  };
};

const getAllAssessmentSubmissions = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  const where: Prisma.AssessmentSubmissionWhereInput = {
    ...(status && { status: status as any }),
  };

  const [total, submissions] = await Promise.all([
    prisma.assessmentSubmission.count({ where }),
    prisma.assessmentSubmission.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assesment: {
          select: {
            id: true,
            title: true,
            assessmentType: true,
          },
        },
        answers: {
          take: 10,
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const applicantIds = Array.from(new Set(submissions.map((s) => s.applicantId)));
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  const validUserObjectIds = applicantIds.filter((id) => objectIdPattern.test(id));

  const users = await prisma.user.findMany({
    where: { id: { in: validUserObjectIds } },
    select: { id: true, fullName: true, email: true, createdAt: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const evaluationResults = await prisma.streamEvaluationResult.findMany({
    where: { applicantId: { in: applicantIds } },
    select: { applicantId: true, matchScore: true },
    orderBy: { matchScore: "desc" },
  });
  const scoreMap = new Map<string, number>();
  evaluationResults.forEach((er) => {
    if (!scoreMap.has(er.applicantId)) {
      scoreMap.set(er.applicantId, er.matchScore);
    }
  });

  const items = submissions.map((sub: any) => {
    const user = userMap.get(sub.applicantId);
    const scoreVal = scoreMap.get(sub.applicantId);
    const scoreStr = scoreVal !== undefined ? `${Math.round(scoreVal)}%` : "N/A";

    let dob = "N/A";
    const dobAnswer = sub.answers?.find(
      (a: any) =>
        a.question?.questionText?.toLowerCase().includes("birth") ||
        a.question?.questionText?.toLowerCase().includes("dob") ||
        a.question?.questionText?.toLowerCase().includes("date"),
    );
    if (dobAnswer && dobAnswer.value) {
      dob = String(dobAnswer.value);
    } else {
      const d = new Date(sub.createdAt);
      dob = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
    }

    const nameAnswer = sub.answers?.find(
      (a: any) =>
        a.question?.questionText?.toLowerCase().includes("name") ||
        a.question?.questionText?.toLowerCase().includes("full name"),
    );
    const emailAnswer = sub.answers?.find(
      (a: any) =>
        a.question?.questionText?.toLowerCase().includes("email"),
    );

    const displayName =
      user?.fullName ||
      (nameAnswer?.value ? String(nameAnswer.value) : `Applicant ${sub.applicantId.slice(-4)}`);
    const displayEmail =
      user?.email || (emailAnswer?.value ? String(emailAnswer.value) : "N/A");

    return {
      id: sub.id,
      applicantId: sub.applicantId,
      name: displayName,
      assessment: sub.assesment?.title || "Assessment",
      assessmentId: sub.assesmentId,
      email: displayEmail,
      score: scoreStr,
      dob,
      status: sub.status === "COMPLETED" ? "Completed" : "Incomplete",
      submittedAt: sub.submittedAt,
      createdAt: sub.createdAt,
    };
  });

  const filteredItems = search
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.email.toLowerCase().includes(search.toLowerCase()) ||
          i.assessment.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return {
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    items: filteredItems,
    submissions: filteredItems,
  };
};

const getSingleAssessmentSubmission = async (id: string) => {
  const submission = await prisma.assessmentSubmission.findUnique({
    where: { id },
    include: {
      assesment: {
        select: {
          id: true,
          title: true,
          assessmentType: true,
        },
      },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              questionText: true,
              questionType: true,
              inputType: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new ApiError(404, "Assessment submission not found.");
  }

  let user = null;
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (objectIdPattern.test(submission.applicantId)) {
    user = await prisma.user.findUnique({
      where: { id: submission.applicantId },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        profileImage: true,
        status: true,
      },
    });
  }

  const evaluationResults = await prisma.streamEvaluationResult.findMany({
    where: { applicantId: submission.applicantId },
    orderBy: { matchScore: "desc" },
    include: {
      stream: {
        select: {
          id: true,
          streamName: true,
        },
      },
    },
  });

  return {
    ...submission,
    user,
    evaluationResults,
  };
};

const deleteAssessment = async (id: string) => {
  const assessment = await prisma.assesment.findUnique({
    where: { id },
  });
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }

  return prisma.assesment.delete({
    where: { id },
  });
};

const formatNumberWithSuffix = (num: number): string => {
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M+`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}K+`;
  }
  return String(num);
};

const formatCurrencyWithSuffix = (amount: number): string => {
  return `$${formatNumberWithSuffix(amount)}`;
};

export interface GetOverviewStatsQuery {
  year?: number;
  filter?: "daily" | "weekly" | "monthly" | string;
  userLimit?: number;
  search?: string;
}

const formatDateToMedium = (date: Date): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const getOverviewStats = async (query: GetOverviewStatsQuery = {}) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = query.year ? Number(query.year) : currentYear;
  const filter = query.filter || "monthly";
  const userLimit = query.userLimit ? Number(query.userLimit) : 5;
  const search = query.search?.trim();

  // 1. Top Metrics Cards
  const [
    totalUsersCount,
    totalAssessmentsCount,
    totalSubmissionsCount,
    totalConsultationsRevenue,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: UserRole.User },
    }),
    prisma.assesment.count(),
    prisma.assessmentSubmission.count(),
    prisma.consultation.aggregate({
      _sum: { amountPaid: true },
    }),
  ]);

  const totalUsers = totalUsersCount;
  const totalAssessments = totalAssessmentsCount;
  const totalReports = totalSubmissionsCount;
  const totalRevenue = totalConsultationsRevenue._sum.amountPaid || 0;

  const formattedTotalUsers = formatNumberWithSuffix(totalUsers);
  const formattedTotalRevenue = formatCurrencyWithSuffix(totalRevenue);

  const statsCards = [
    { title: "Total Users", value: formattedTotalUsers },
    { title: "Assessments", value: String(totalAssessments) },
    { title: "Total Reports", value: String(totalReports) },
    { title: "Total Revenue", value: formattedTotalRevenue },
  ];

  // 2. Revenue Chart Data based on filter
  let chartData: { label: string; totalRevenue: number; month?: string; revenue?: number }[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (filter === "daily") {
    // Current week Monday to Sunday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyTotals = new Array(7).fill(0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const consultationsInWeek = await prisma.consultation.findMany({
      where: {
        scheduledAt: {
          gte: monday,
          lte: sunday,
        },
      },
      select: { amountPaid: true, scheduledAt: true },
    });

    consultationsInWeek.forEach((c) => {
      if (c.scheduledAt) {
        const d = new Date(c.scheduledAt).getDay();
        const index = d === 0 ? 6 : d - 1;
        if (index >= 0 && index < 7) {
          dailyTotals[index] += c.amountPaid || 0;
        }
      }
    });

    chartData = weekDays.map((label, idx) => ({
      label,
      totalRevenue: Math.round(dailyTotals[idx] * 100) / 100,
    }));
  } else if (filter === "weekly") {
    // 4 weeks of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const consultationsInMonth = await prisma.consultation.findMany({
      where: {
        scheduledAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: { amountPaid: true, scheduledAt: true },
    });

    const weeklyTotals = [0, 0, 0, 0];
    consultationsInMonth.forEach((c) => {
      if (c.scheduledAt) {
        const dayOfMonth = new Date(c.scheduledAt).getDate();
        const weekIndex = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
        weeklyTotals[weekIndex] += c.amountPaid || 0;
      }
    });

    chartData = ["Week 1", "Week 2", "Week 3", "Week 4"].map((label, idx) => ({
      label,
      totalRevenue: Math.round(weeklyTotals[idx] * 100) / 100,
    }));
  } else {
    // monthly default
    const yearStartDate = new Date(selectedYear, 0, 1);
    const yearEndDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const consultationsInYear = await prisma.consultation.findMany({
      where: {
        scheduledAt: {
          gte: yearStartDate,
          lte: yearEndDate,
        },
      },
      select: {
        amountPaid: true,
        scheduledAt: true,
      },
    });

    const monthlyTotals = new Array(12).fill(0);
    consultationsInYear.forEach((item) => {
      if (item.scheduledAt) {
        const monthIndex = new Date(item.scheduledAt).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyTotals[monthIndex] += item.amountPaid || 0;
        }
      }
    });

    chartData = monthNames.map((month, index) => {
      const rev = Math.round(monthlyTotals[index] * 100) / 100;
      return {
        label: month,
        month,
        totalRevenue: rev,
        revenue: rev,
      };
    });
  }

  // 3. General Pathway Breakdown (Donut Chart)
  const submissionsWithType = await prisma.assessmentSubmission.findMany({
    select: {
      assesment: {
        select: {
          assessmentType: true,
          title: true,
        },
      },
    },
  });

  const pathwayCounts: Record<string, number> = {
    APPLY_FOR_PERMANENT_RESIDENCE: 0,
    STUDY_IN_CANADA: 0,
    WORK_IN_CANADA: 0,
    JOIN_FAMILY_IN_CANADA: 0,
  };

  submissionsWithType.forEach((sub) => {
    const type = sub.assesment?.assessmentType;
    if (type && pathwayCounts[type] !== undefined) {
      pathwayCounts[type]++;
    }
  });

  const totalSubmissions = submissionsWithType.length;

  const pathwayColors: Record<string, string> = {
    APPLY_FOR_PERMANENT_RESIDENCE: "#6140E6",
    STUDY_IN_CANADA: "#52C41A",
    WORK_IN_CANADA: "#FAAD14",
    JOIN_FAMILY_IN_CANADA: "#13C2C2",
  };

  const pathwayLabelMap: Record<string, string> = {
    APPLY_FOR_PERMANENT_RESIDENCE: "Permanent Residence",
    STUDY_IN_CANADA: "Study in Canada",
    WORK_IN_CANADA: "Work in Canada",
    JOIN_FAMILY_IN_CANADA: "Join Family in Canada",
  };

  const pathwayBreakdown = Object.keys(pathwayCounts).map((key) => {
    const count = pathwayCounts[key];
    const percentage =
      totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;
    return {
      key,
      name: pathwayLabelMap[key] || key,
      count,
      percentage,
      color: pathwayColors[key] || "#8884d8",
    };
  });

  const pathwayData = pathwayBreakdown.map((item) => ({
    name: `${item.name} ${item.percentage}%`,
    value: item.percentage,
    color: item.color,
  }));

  // 4. Recent Users Management Preview
  const userWhereCondition: Prisma.UserWhereInput = {
    role: UserRole.User,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const recentUsersList = await prisma.user.findMany({
    where: userWhereCondition,
    take: userLimit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      status: true,
      createdAt: true,
    },
  });

  const userIds = recentUsersList.map((u) => u.id);

  // Fetch evaluation results for these users
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
    { maxScore: number; matchedProgramsCount: number; totalCount: number }
  > = {};

  evaluationResults.forEach((evalResult) => {
    const userId = evalResult.applicantId;
    if (!evaluationsByUser[userId]) {
      evaluationsByUser[userId] = {
        maxScore: evalResult.matchScore || 0,
        matchedProgramsCount: 0,
        totalCount: 0,
      };
    }
    evaluationsByUser[userId].totalCount += 1;
    if (evalResult.matchScore > evaluationsByUser[userId].maxScore) {
      evaluationsByUser[userId].maxScore = evalResult.matchScore;
    }
    if (
      evalResult.eligibilityStatus !== "NOT_ELIGIBLE" &&
      evalResult.eligibilityStatus !== "Not Eligible Yet"
    ) {
      evaluationsByUser[userId].matchedProgramsCount += 1;
    }
  });

  const recentUsers = recentUsersList.map((user) => {
    const userEval = evaluationsByUser[user.id];
    const scoreVal = userEval ? Math.round(userEval.maxScore) : 0;
    const matchedCount = userEval
      ? userEval.matchedProgramsCount || userEval.totalCount
      : 0;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage || "https://i.pravatar.cc/150?u=" + user.id,
      score: String(scoreVal),
      assessmentScore: scoreVal,
      matchedPrograms: String(matchedCount),
      joined: formatDateToMedium(new Date(user.createdAt)),
      createdAt: user.createdAt,
      status: user.status,
    };
  });

  return {
    stats: {
      totalUsers,
      totalAssessments,
      totalReports,
      totalRevenue,
      formattedTotalUsers,
      formattedTotalRevenue,
    },
    statsCards,
    chartData,
    revenueChart: {
      year: selectedYear,
      filter,
      monthlyData: chartData,
    },
    pathwayBreakdown,
    pathwayData,
    recentUsers,
  };
};

const submitAssessment = async (
  payload: SubmitAssessmentInput,
  userId?: string,
) => {
  const applicantId =
    userId ||
    payload.applicantId ||
    (payload as any).userId ||
    crypto.randomBytes(12).toString("hex");

  return await submissionService.submitAssessment(applicantId, payload);
};

const deleteAdminFromDB = async (adminId: string) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }
  return await prisma.user.delete({
    where: { id: adminId },
  });
};

export const adminService = {
  createNewOrganization,
  getAllAssessments,
  createNewQuestion,
  updateQuestion,
  assesmentWiseQuestionsFromDB,
  deleteQuestion,
  bulkCreateQuestions,
  createAssessment,
  createNewAdmin,
  registerAdmin,
  getAllAdminsFromDB,
  getAllOrganizationsFromDB,
  getGetQuestionTypeWise,
  createQuestionGroup,
  getOverviewStats,
  getAllAssessmentSubmissions,
  getSingleAssessmentSubmission,
  deleteAssessment,
  submitAssessment,
  deleteAdminFromDB,
};

