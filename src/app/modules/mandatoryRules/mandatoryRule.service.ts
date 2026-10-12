import {
  PrismaClient,
  Prisma,
  RulePurpose,
  RuleStatus,
  RuleOperator,
  FailureResult,
  ScoringMethod,
  OccupationMatchType,
  QuestionInputType,
} from "@prisma/client";

const prisma = new PrismaClient();

export interface OccupationConditionInput {
  nocCode?: string;
  occupationName?: string;
  teer?: number;
  occupationCategory?: string;
  priorityOccupation?: boolean;
  matchType?: OccupationMatchType;
  includedNocList?: string[];
  excludedNocList?: string[];
}

export interface CreateRuleInput {
  streamId: string;
  organizationId?: string;
  ruleName: string;
  ruleGroup?: string;
  ruleCategory: string;
  rulePurpose: RulePurpose;
  status?: RuleStatus;
  priorityOrder?: number;

  assessmentSection?: string;
  questionId?: string;
  dataField?: string;
  dataType?: QuestionInputType;
  operator: RuleOperator;
  comparisonValue?: string;
  secondaryValue?: string;

  // Mandatory-only
  failureResult?: FailureResult;
  missingRequirementMessage?: string;
  furtherReviewRequired?: boolean;

  // Scoring-only
  weightPercentage?: number;
  maximumFactorScore?: number;
  scoringMethod?: ScoringMethod;
  scoreAwarded?: number;
  scoringBands?: Prisma.InputJsonValue;

  occupationCondition?: OccupationConditionInput;

  whyRecommended?: string;
  improvementRecommendation?: string;
  nextSteps?: string;

  effectiveStartDate?: Date;
  effectiveEndDate?: Date;
  doesNotExpire?: boolean;
  changeNotes?: string;

  createdBy?: string;
}

export interface UpdateRuleInput extends Partial<Omit<CreateRuleInput, "streamId">> {
  updatedBy?: string;
}

export interface ListRulesFilter {
  streamId?: string;
  rulePurpose?: RulePurpose;
  status?: RuleStatus;
  ruleCategory?: string;
  page?: number;
  limit?: number;
}

// Categories that need the occupation condition sub-form (client
// point 3: only show Occupation Matching for these).
const OCCUPATION_RELATED_CATEGORIES = ["occupation", "work_experience"];

const createRule = async (data: CreateRuleInput) => {
  const stream = await assertStreamExists(data.streamId);
  validateRulePurposeFields(data);

  const { occupationCondition, ...ruleData } = data;

  return prisma.rule.create({
    data: {
      ...ruleData,
      programId: stream.programId, // denormalized for reporting, per client's field list
      status: data.status ?? RuleStatus.DRAFT,
      priorityOrder: data.priorityOrder ?? 0,
      doesNotExpire: data.doesNotExpire ?? false,
      furtherReviewRequired: data.furtherReviewRequired ?? false,
      ...(occupationCondition && {
        occupationCondition: { create: occupationCondition },
      }),
    },
    include: { occupationCondition: true },
  });
};

const findAllRules = async (filter: ListRulesFilter = {}) => {
  const { streamId, rulePurpose, status, ruleCategory, page = 1, limit = 20 } = filter;

  const where: Prisma.RuleWhereInput = {
    ...(streamId && { streamId }),
    ...(rulePurpose && { rulePurpose }),
    ...(status && { status }),
    ...(ruleCategory && { ruleCategory }),
  };

  const [items, total] = await Promise.all([
    prisma.rule.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { priorityOrder: "asc" },
      include: { occupationCondition: true },
    }),
    prisma.rule.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// Matching-engine shortcut — only rules the engine should evaluate.
// RuleStatus behaviour per client point 10: only ACTIVE evaluates
// in production; TESTING evaluates only in the sandbox (pass
// includeTesting: true there).
const findEvaluableByStream = async (streamId: string, includeTesting = false) => {
  return prisma.rule.findMany({
    where: {
      streamId,
      status: includeTesting ? { in: [RuleStatus.ACTIVE, RuleStatus.TESTING] } : RuleStatus.ACTIVE,
    },
    include: { occupationCondition: true },
  });
};

const findRuleById = async (id: string) => {
  const rule = await prisma.rule.findUnique({
    where: { id },
    include: {
      occupationCondition: true,
      stream: { select: { id: true, streamName: true, programId: true } },
    },
  });

  if (!rule) {
    throw new Error(`Rule with id ${id} not found`);
  }

  return rule;
};

const updateRule = async (id: string, data: UpdateRuleInput) => {
  const existing = await assertExists(id);
  const merged = { ...existing, ...data };
  validateRulePurposeFields(merged as CreateRuleInput);

  const { occupationCondition, ...ruleData } = data;

  return prisma.rule.update({
    where: { id },
    data: {
      ...ruleData,
      ...(occupationCondition && {
        occupationCondition: {
          upsert: {
            create: occupationCondition,
            update: occupationCondition,
          },
        },
      }),
    },
    include: { occupationCondition: true },
  });
};

const setStatus = async (id: string, status: RuleStatus, updatedBy?: string) => {
  await assertExists(id);
  return prisma.rule.update({ where: { id }, data: { status, updatedBy } });
};

const deleteRule = async (id: string) => {
  await assertExists(id);
  // occupationCondition cascades via onDelete: Cascade on that model
  return prisma.rule.delete({ where: { id } });
};

// Client point 6: "Total scoring-factor weights for the stream must
// equal 100%. However, during draft configuration, the system may
// show a warning rather than block saving." — this returns the
// warning data; the caller decides whether to block or just warn
// based on the stream's/rule's current status.
const validateScoringWeights = async (streamId: string) => {
  const factors = await prisma.rule.findMany({
    where: { streamId, rulePurpose: RulePurpose.SCORING_FACTOR, status: RuleStatus.ACTIVE },
    select: { weightPercentage: true },
  });

  const total = factors.reduce((sum, f) => sum + (f.weightPercentage ?? 0), 0);
  const isValid = Math.abs(total - 100) <= 0.5; // small tolerance for rounding

  return { isValid, total, factorCount: factors.length };
};

// ============================================================
// Client point 7: field requirements differ by rulePurpose.
// Mandatory rules require operator/comparisonValue/failureResult;
// scoring factors require weightPercentage/scoringMethod. This
// throws early rather than letting a malformed rule save silently.
// ============================================================
function validateRulePurposeFields(data: Partial<CreateRuleInput>) {
  if (!data.rulePurpose) return;

  if (data.rulePurpose === RulePurpose.MANDATORY_ELIGIBILITY_RULE) {
    if (!data.operator) throw new Error("operator is required for a Mandatory Eligibility Rule");
    if (!data.failureResult) throw new Error("failureResult is required for a Mandatory Eligibility Rule");
    if (data.weightPercentage !== undefined) {
      throw new Error("weightPercentage should not be set on a Mandatory Eligibility Rule");
    }
  }

  if (data.rulePurpose === RulePurpose.SCORING_FACTOR) {
    if (data.weightPercentage === undefined) {
      throw new Error("weightPercentage is required for a Scoring Factor");
    }
    if (!data.scoringMethod) throw new Error("scoringMethod is required for a Scoring Factor");
    if (data.failureResult) {
      throw new Error("failureResult should not be set on a Scoring Factor");
    }
  }

  if (data.ruleCategory && !OCCUPATION_RELATED_CATEGORIES.includes(data.ruleCategory) && data.occupationCondition) {
    throw new Error(
      `occupationCondition should only be set when ruleCategory is one of: ${OCCUPATION_RELATED_CATEGORIES.join(", ")}`,
    );
  }
}

const assertExists = async (id: string) => {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Rule with id ${id} not found`);
  }
  return existing;
};

const assertStreamExists = async (streamId: string) => {
  const stream = await prisma.stream.findUnique({ where: { id: streamId }, select: { id: true, programId: true } });
  if (!stream) {
    throw new Error(`Stream with id ${streamId} not found`);
  }
  return stream;
};

export const ruleService = {
  createRule,
  findAllRules,
  findEvaluableByStream,
  findRuleById,
  updateRule,
  setStatus,
  deleteRule,
  validateScoringWeights,
};