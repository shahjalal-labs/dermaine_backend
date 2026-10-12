import {
  PrismaClient,
  Prisma,
  StreamStatus,
  StreamVisibility,
  AssessmentType,
} from "@prisma/client";

const prisma = new PrismaClient();

// Statuses the matching engine should never evaluate, unless an
// admin explicitly overrides it.
const NON_EVALUABLE_STATUSES: StreamStatus[] = [
  StreamStatus.CLOSED,
  StreamStatus.SUSPENDED,
  StreamStatus.PAUSED,
  StreamStatus.ARCHIVED,
  StreamStatus.INACTIVE,
  StreamStatus.INTAKE_FULL,
];

export interface CreateStreamInput {
  programId: string;
  organizationId?: string;
  streamName: string;
  country?: string;
  provinceRegion?: string;
  category?: string;
  assessmentTypes: AssessmentType[];
  status?: StreamStatus;
  visibility?: StreamVisibility;
  priorityRanking?: number;
  effectiveStartDate?: Date;
  effectiveEndDate?: Date;
  versionNumber?: number;
}

export interface UpdateStreamInput extends Partial<Omit<CreateStreamInput, "programId">> {
  isArchived?: boolean;
  isDisabled?: boolean;
  isPremiumOnly?: boolean;
  showInFreeResults?: boolean;
  lastReviewedDate?: Date;
  description?: string;
  publicSummary?: string;
  internalNotes?: string;
  processingTime?: string;
  languageRequirementSummary?: string;
  educationRequirementSummary?: string;
  workExperienceRequirementSummary?: string;
  jobOfferRequirementSummary?: string;
  settlementFundsSummary?: string;
  provinceConnectionSummary?: string;
  familyRelationshipRequirement?: string;
  crsRequirementSummary?: string;
}

export interface ListStreamsFilter {
  programId?: string;
  organizationId?: string;
  country?: string;
  status?: StreamStatus;
  assessmentType?: AssessmentType;
  includeArchived?: boolean;
  includeDisabled?: boolean;
  page?: number;
  limit?: number;
}

export interface MatchingEngineQuery {
  assessmentType: AssessmentType;
  country: string;
  asOfDate?: Date;
  allowOverride?: boolean;
}

const createStream = async (data: CreateStreamInput) => {
  await assertProgramExists(data.programId);

  return prisma.stream.create({
    data: {
      ...data,
      country: data.country ?? "Canada",
      status: data.status ?? StreamStatus.ACTIVE,
      visibility: data.visibility ?? StreamVisibility.PUBLIC,
      priorityRanking: data.priorityRanking ?? 0,
      versionNumber: data.versionNumber ?? 1,
    },
  });
};

const findAllStreams = async (filter: ListStreamsFilter = {}) => {
  const {
    programId,
    organizationId,
    country,
    status,
    assessmentType,
    includeArchived = false,
    includeDisabled = false,
    page = 1,
    limit = 20,
  } = filter;

  const where: Prisma.StreamWhereInput = {
    ...(programId && { programId }),
    ...(organizationId && { organizationId }),
    ...(country && { country }),
    ...(status && { status }),
    ...(assessmentType && { assessmentTypes: { has: assessmentType } }),
    ...(!includeArchived && { isArchived: false }),
    ...(!includeDisabled && { isDisabled: false }),
  };

  const [items, total] = await Promise.all([
    prisma.stream.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { priorityRanking: "desc" },
      include: { program: { select: { id: true, name: true } } },
    }),
    prisma.stream.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findStreamById = async (id: string) => {
  const stream = await prisma.stream.findUnique({
    where: { id },
    include: {
      program: true,
      rules: { include: { occupationCondition: true } },
    },
  });

  if (!stream) {
    throw new Error(`Stream with id ${id} not found`);
  }

  return stream;
};

const updateStream = async (id: string, data: UpdateStreamInput) => {
  await assertExists(id);

  return prisma.stream.update({
    where: { id },
    data,
  });
};

const setArchived = async (id: string, isArchived: boolean) => {
  await assertExists(id);
  return prisma.stream.update({ where: { id }, data: { isArchived } });
};

const setDisabled = async (id: string, isDisabled: boolean) => {
  await assertExists(id);
  return prisma.stream.update({ where: { id }, data: { isDisabled } });
};

const deleteStream = async (id: string) => {
  await assertExists(id);
  return prisma.stream.delete({ where: { id } });
};

// ============================================================
// MATCHING ENGINE ENTRY POINT — doc section 3 & 7 filters.
// Includes rules + occupationCondition so the evaluation layer
// doesn't need a second round-trip per stream.
// ============================================================
const findEvaluableStreams = async (query: MatchingEngineQuery) => {
  const { assessmentType, country, asOfDate = new Date(), allowOverride = false } = query;

  const where: Prisma.StreamWhereInput = {
    ...(assessmentType && { assessmentTypes: { has: assessmentType } }),
    ...(country && { country }),
    isArchived: false,
    isDisabled: false,
    visibility: { not: StreamVisibility.HIDDEN },
    ...(!allowOverride && {
      status: { notIn: NON_EVALUABLE_STATUSES },
    }),
  };

  const streams = await prisma.stream.findMany({
    where,
    orderBy: { priorityRanking: "desc" },
    include: {
      rules: { include: { occupationCondition: true } },
      program: { select: { id: true, name: true } },
    },
  });

  // Filter effective dates in JavaScript to handle MongoDB null vs isSet seamlessly
  return streams.filter((s) => {
    if (s.effectiveStartDate && s.effectiveStartDate > asOfDate) return false;
    if (s.effectiveEndDate && s.effectiveEndDate < asOfDate) return false;
    return true;
  });
};


const assertExists = async (id: string) => {
  const exists = await prisma.stream.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new Error(`Stream with id ${id} not found`);
  }
};

const assertProgramExists = async (programId: string) => {
  const exists = await prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
  if (!exists) {
    throw new Error(`Program with id ${programId} not found`);
  }
};

export const streamService = {
  createStream,
  findAllStreams,
  findStreamById,
  updateStream,
  setArchived,
  setDisabled,
  deleteStream,
  findEvaluableStreams,
};