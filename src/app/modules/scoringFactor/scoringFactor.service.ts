import { PrismaClient, RulePurpose, RuleStatus, RuleOperator, ScoringMethod } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";

const prisma = new PrismaClient();

export interface CreateScoringFactorPayload {
  streamId: string;
  name?: string;
  ruleName?: string;
  category?: string;
  ruleCategory?: string;
  questionId?: string;
  weight?: number;
  weightPercentage?: number;
  maxPoints?: number;
  maximumFactorScore?: number;
  scoreMapping?: any;
  scoringBands?: any;
  description?: string;
  improvementRecommendation?: string;
}

export interface ListScoringFactorsQuery {
  streamId?: string;
  category?: string;
  status?: RuleStatus;
  page?: number;
  limit?: number;
}

const mapRuleToScoringFactor = (rule: any) => ({
  id: rule.id,
  _id: rule.id,
  streamId: rule.streamId,
  name: rule.ruleName,
  ruleName: rule.ruleName,
  category: rule.ruleCategory,
  ruleCategory: rule.ruleCategory,
  questionId: rule.questionId,
  weight: rule.weightPercentage !== null && rule.weightPercentage !== undefined ? rule.weightPercentage / 100 : 0,
  weightPercentage: rule.weightPercentage,
  maxPoints: rule.maximumFactorScore ?? 100,
  maximumFactorScore: rule.maximumFactorScore ?? 100,
  scoreMapping: rule.scoringBands,
  scoringBands: rule.scoringBands,
  improvementRecommendation: rule.improvementRecommendation,
  status: rule.status,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const create = async (payload: CreateScoringFactorPayload) => {
  const stream = await prisma.stream.findUnique({
    where: { id: payload.streamId },
    select: { id: true, programId: true },
  });

  if (!stream) {
    throw new ApiError(404, `Stream with id ${payload.streamId} not found`);
  }

  const weightPercent =
    payload.weightPercentage ??
    (payload.weight !== undefined ? Number(payload.weight) * (payload.weight <= 1 ? 100 : 1) : 0);

  const maxScore = payload.maxPoints ?? payload.maximumFactorScore ?? 100;
  const scoringBandsData = payload.scoreMapping ?? payload.scoringBands ?? null;

  const rule = await prisma.rule.create({
    data: {
      streamId: stream.id,
      programId: stream.programId,
      ruleName: payload.name || payload.ruleName || "Scoring Factor",
      ruleCategory: payload.category || payload.ruleCategory || "crs",
      rulePurpose: RulePurpose.SCORING_FACTOR,
      status: RuleStatus.ACTIVE,
      operator: RuleOperator.EQUALS,
      questionId: payload.questionId || null,
      weightPercentage: weightPercent,
      maximumFactorScore: maxScore,
      scoringMethod: ScoringMethod.RANGE_BAND,
      scoringBands: scoringBandsData,
      improvementRecommendation: payload.improvementRecommendation || payload.description || null,
    },
  });

  return mapRuleToScoringFactor(rule);
};

const findAll = async (query: ListScoringFactorsQuery = {}) => {
  const { streamId, category, status, page = 1, limit = 100 } = query;

  const where: any = {
    rulePurpose: RulePurpose.SCORING_FACTOR,
    ...(streamId && { streamId }),
    ...(category && { ruleCategory: category }),
    ...(status && { status }),
  };

  const [rules, total] = await Promise.all([
    prisma.rule.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.rule.count({ where }),
  ]);

  const items = rules.map(mapRuleToScoringFactor);

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
};

const findById = async (id: string) => {
  const rule = await prisma.rule.findUnique({
    where: { id },
  });

  if (!rule || rule.rulePurpose !== RulePurpose.SCORING_FACTOR) {
    throw new ApiError(404, `Scoring factor with id ${id} not found`);
  }

  return mapRuleToScoringFactor(rule);
};

const update = async (id: string, payload: Partial<CreateScoringFactorPayload>) => {
  const existing = await prisma.rule.findUnique({
    where: { id },
  });

  if (!existing || existing.rulePurpose !== RulePurpose.SCORING_FACTOR) {
    throw new ApiError(404, `Scoring factor with id ${id} not found`);
  }

  const weightPercent =
    payload.weightPercentage ??
    (payload.weight !== undefined ? Number(payload.weight) * (payload.weight <= 1 ? 100 : 1) : undefined);

  const updated = await prisma.rule.update({
    where: { id },
    data: {
      ...(payload.name || payload.ruleName ? { ruleName: payload.name || payload.ruleName } : {}),
      ...(payload.category || payload.ruleCategory ? { ruleCategory: payload.category || payload.ruleCategory } : {}),
      ...(payload.questionId !== undefined ? { questionId: payload.questionId } : {}),
      ...(weightPercent !== undefined ? { weightPercentage: weightPercent } : {}),
      ...(payload.maxPoints !== undefined || payload.maximumFactorScore !== undefined
        ? { maximumFactorScore: payload.maxPoints ?? payload.maximumFactorScore }
        : {}),
      ...(payload.scoreMapping !== undefined || payload.scoringBands !== undefined
        ? { scoringBands: payload.scoreMapping ?? payload.scoringBands }
        : {}),
      ...(payload.improvementRecommendation || payload.description
        ? { improvementRecommendation: payload.improvementRecommendation || payload.description }
        : {}),
    },
  });

  return mapRuleToScoringFactor(updated);
};

const deleteScoringFactor = async (id: string) => {
  const existing = await prisma.rule.findUnique({
    where: { id },
  });

  if (!existing || existing.rulePurpose !== RulePurpose.SCORING_FACTOR) {
    throw new ApiError(404, `Scoring factor with id ${id} not found`);
  }

  return prisma.rule.delete({
    where: { id },
  });
};

export const scoringFactorService = {
  create,
  findAll,
  findById,
  update,
  deleteScoringFactor,
};
