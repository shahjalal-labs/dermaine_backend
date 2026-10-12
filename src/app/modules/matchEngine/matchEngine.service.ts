import {
  RuleOperator,
  AssessmentType,
  Rule,
  Stream,
  RuleStatus,
} from "@prisma/client";
import { streamService } from "../stream/stream.service";
import prisma from "../../../shared/prisma";

// Applicant's submitted assessment answers, keyed by Question.questionId.
export type ApplicantAnswers = Record<
  string,
  string | number | boolean | (string | number)[]
>;

// ============================================================
// Section 7: match category bands
// ============================================================
type MatchCategory =
  | "Strong Match"
  | "Moderate Match"
  | "Fair Match"
  | "Improvement Required"
  | "Not Eligible Yet";

function classifyByScore(score: number): MatchCategory {
  if (score >= 80) return "Strong Match";
  if (score >= 65) return "Moderate Match";
  if (score >= 50) return "Fair Match";
  if (score >= 35) return "Improvement Required";
  return "Not Eligible Yet";
}

// ============================================================
// ASSUMPTION — mapping FailureResult -> category override.
// Your schema replaced the old `severity` field with `failureResult`
// (client's confirmed spec), so the override logic now keys off
// that instead. This mapping isn't explicitly spelled out anywhere —
// confirm with the client before this goes live:
//   NOT_ELIGIBLE            -> force "Not Eligible Yet", any score
//   POTENTIALLY_ELIGIBLE    -> cap at "Improvement Required"
//   MISSING_REQUIREMENT     -> cap at "Improvement Required"
//   FURTHER_REVIEW_REQUIRED -> cap at "Improvement Required" +
//                               flagged separately (requiresFurtherReview)
// ============================================================
function classifyWithMandatoryOverride(
  rawScore: number,
  failedRules: Rule[],
): { category: MatchCategory; requiresFurtherReview: boolean } {
  const requiresFurtherReview = failedRules.some(
    (r) => r.failureResult === "FURTHER_REVIEW_REQUIRED",
  );

  if (failedRules.length === 0) {
    return {
      category: classifyByScore(rawScore),
      requiresFurtherReview: false,
    };
  }

  const hasHardFailure = failedRules.some(
    (r) => r.failureResult === "NOT_ELIGIBLE",
  );
  if (hasHardFailure) {
    return { category: "Not Eligible Yet", requiresFurtherReview };
  }

  const scoreCategory = classifyByScore(rawScore);
  if (
    scoreCategory === "Strong Match" ||
    scoreCategory === "Moderate Match" ||
    scoreCategory === "Fair Match"
  ) {
    return { category: "Improvement Required", requiresFurtherReview };
  }
  return { category: scoreCategory, requiresFurtherReview };
}

// ============================================================
// Operator comparison — used by MANDATORY_ELIGIBILITY_RULE rules,
// and by SCORING_FACTOR rules using FIXED_SCORE/BOOLEAN_SCORE methods.
// Expanded to match your current (larger) RuleOperator enum.
// ============================================================
export function compareValues(
  operator: RuleOperator,
  applicantValue: unknown,
  comparisonValue: string | null,
  secondaryValue: string | null,
): boolean {
  const numApplicant = Number(applicantValue);
  const numComparison =
    comparisonValue !== null ? Number(comparisonValue) : NaN;
  const bothNumeric =
    !Number.isNaN(numApplicant) && !Number.isNaN(numComparison);

  switch (operator) {
    case "EQUALS":
      return bothNumeric
        ? numApplicant === numComparison
        : String(applicantValue) === comparisonValue;
    case "NOT_EQUALS":
      return bothNumeric
        ? numApplicant !== numComparison
        : String(applicantValue) !== comparisonValue;
    case "GREATER_THAN":
      return bothNumeric && numApplicant > numComparison;
    case "GREATER_THAN_OR_EQUAL":
      return bothNumeric && numApplicant >= numComparison;
    case "LESS_THAN":
      return bothNumeric && numApplicant < numComparison;
    case "LESS_THAN_OR_EQUAL":
      return bothNumeric && numApplicant <= numComparison;
    case "BETWEEN": {
      if (!secondaryValue || !comparisonValue) return false;
      const min = Number(comparisonValue);
      const max = Number(secondaryValue);
      return (
        !Number.isNaN(numApplicant) &&
        numApplicant >= min &&
        numApplicant <= max
      );
    }
    case "IN_LIST": {
      if (!comparisonValue) return false;
      const allowed: (string | number)[] = JSON.parse(comparisonValue);
      const values = Array.isArray(applicantValue)
        ? applicantValue
        : [applicantValue];
      return values.some((v) => allowed.includes(v as string | number));
    }
    case "NOT_IN_LIST": {
      if (!comparisonValue) return false;
      const disallowed: (string | number)[] = JSON.parse(comparisonValue);
      const values = Array.isArray(applicantValue)
        ? applicantValue
        : [applicantValue];
      return values.every((v) => !disallowed.includes(v as string | number));
    }
    case "CONTAINS":
      return (
        typeof applicantValue === "string" &&
        comparisonValue !== null &&
        applicantValue.includes(comparisonValue)
      );
    case "NOT_CONTAINS":
      return (
        typeof applicantValue === "string" &&
        comparisonValue !== null &&
        !applicantValue.includes(comparisonValue)
      );
    case "IS_TRUE":
      return applicantValue === true || applicantValue === "true";
    case "IS_FALSE":
      return applicantValue === false || applicantValue === "false";
    case "IS_EMPTY":
      return (
        applicantValue === undefined ||
        applicantValue === null ||
        applicantValue === "" ||
        (Array.isArray(applicantValue) && applicantValue.length === 0)
      );
    case "IS_NOT_EMPTY":
      return !(
        applicantValue === undefined ||
        applicantValue === null ||
        applicantValue === "" ||
        (Array.isArray(applicantValue) && applicantValue.length === 0)
      );
    default:
      return false;
  }
}

// ============================================================
// ASSUMPTION — ScoreTier shape for Rule.scoringBands, used by
// RANGE_BAND and LOOKUP_TABLE scoring methods. Not specified
// anywhere in the doc — confirm with the client before building
// the admin UI that writes this JSON.
// ============================================================
export interface ScoreTier {
  score: number; // 0-1
  min?: number;
  max?: number;
  equals?: string | number | boolean;
  in?: (string | number)[];
}

function scoreFromBands(
  applicantValue: unknown,
  tiers: ScoreTier[] | null | undefined,
): number {
  if (!tiers || tiers.length === 0) return 0;

  for (const tier of tiers) {
    if (tier.equals !== undefined && applicantValue === tier.equals)
      return tier.score;
    if (
      tier.in !== undefined &&
      tier.in.includes(applicantValue as string | number)
    )
      return tier.score;
    if (tier.min !== undefined || tier.max !== undefined) {
      const num = Number(applicantValue);
      if (Number.isNaN(num)) continue;
      const aboveMin = tier.min === undefined || num >= tier.min;
      const belowMax = tier.max === undefined || num <= tier.max;
      if (aboveMin && belowMax) return tier.score;
    }
  }
  return 0;
}

// ============================================================
// Computes a SCORING_FACTOR rule's raw 0-1 score, branching on
// scoringMethod. FORMULA is NOT implemented — your schema has no
// field to store a formula expression. If you need it, add e.g.
// `formulaExpression String?` to Rule; until then FORMULA rules
// always score 0 (logged so it's visible, not silently wrong).
// ============================================================
function computeFactorScore(rule: Rule, applicantValue: unknown): number {
  switch (rule.scoringMethod) {
    case "BOOLEAN_SCORE": {
      const isTrue = applicantValue === true || applicantValue === "true";
      return isTrue
        ? (rule.scoreAwarded ?? 1) / (rule.maximumFactorScore ?? 1)
        : 0;
    }
    case "FIXED_SCORE": {
      const conditionMet = compareValues(
        rule.operator,
        applicantValue,
        rule.comparisonValue,
        rule.secondaryValue,
      );
      return conditionMet
        ? (rule.scoreAwarded ?? 1) / (rule.maximumFactorScore ?? 1)
        : 0;
    }
    case "PERCENTAGE": {
      // ASSUMPTION: applicantValue is already a 0-100 number representing
      // a direct percentage (e.g. "years of experience as % of max required").
      const num = Number(applicantValue);
      if (Number.isNaN(num)) return 0;
      return Math.min(1, Math.max(0, num / 100));
    }
    case "RANGE_BAND":
    case "LOOKUP_TABLE": {
      const tiers = rule.scoringBands as unknown as ScoreTier[] | null;
      return scoreFromBands(applicantValue, tiers);
    }
    case "FORMULA":
      console.warn(
        `Rule ${rule.id} ("${rule.ruleName}") uses FORMULA scoring, which has no backing field yet — scoring 0.`,
      );
      return 0;
    default:
      return 0;
  }
}

// ============================================================
// Section 12: structured result object, per stream
// ============================================================
export interface StreamMatchResult {
  streamId: string;
  programId: string;
  programName: string;
  streamName: string;

  eligibilityStatus: MatchCategory;
  requiresFurtherReview: boolean;
  matchScore: number; // 0-100

  mandatoryPassCount: number;
  mandatoryTotal: number;

  missingRequirements: string[];
  improvementRecommendations: string[];
  strengths: string[];

  priorityRanking: number;
  showInFreeResults: boolean;
  showInPaidReport: boolean;
}

// A rule is only evaluable if ACTIVE (or TESTING, in the sandbox)
// AND currently within its effective date window.
function isRuleEvaluable(
  rule: Rule,
  asOfDate: Date,
  includeTesting: boolean,
): boolean {
  const statusOk =
    rule.status === RuleStatus.ACTIVE ||
    (includeTesting && rule.status === RuleStatus.TESTING);
  if (!statusOk) return false;

  if (rule.effectiveStartDate && rule.effectiveStartDate > asOfDate)
    return false;
  if (
    !rule.doesNotExpire &&
    rule.effectiveEndDate &&
    rule.effectiveEndDate < asOfDate
  )
    return false;

  return true;
}

export interface ApplicantOccupation {
  questionId?: string;
  questionDbId?: string;
  occupationTitle?: string;
  nocCode?: string;
  teer?: number;
  category?: string;
  isPriority?: boolean;
  groupKey?: string;
  instanceIndex?: number;
}

// ============================================================
// Evaluate ONE stream against the applicant's answers.
// Single `rules` array now, split by rulePurpose instead of
// pulling from two separate relations.
// ============================================================
async function evaluateStream(
  stream: Stream & { rules: (Rule & { occupationCondition?: any })[] },
  answers: ApplicantAnswers,
  asOfDate: Date,
  includeTesting: boolean,
  occupations: ApplicantOccupation[] = [],
): Promise<Omit<StreamMatchResult, "programId" | "programName">> {
  const evaluableRules = stream.rules.filter((r) =>
    isRuleEvaluable(r, asOfDate, includeTesting),
  );

  // ---- A. Mandatory rules: PASS/FAIL ----
  const mandatoryRules = evaluableRules.filter(
    (r) => r.rulePurpose === "MANDATORY_ELIGIBILITY_RULE",
  );
  const failedRules: Rule[] = [];
  const passedRules: Rule[] = [];

  for (const rule of mandatoryRules) {
    let passed = false;

    if (rule.occupationCondition && occupations.length > 0) {
      const cond = rule.occupationCondition;
      passed = occupations.some((occ) => {
        if (cond.matchType === "EXACT_NOC") {
          return occ.nocCode === cond.nocCode;
        }
        if (cond.matchType === "NOC_LIST") {
          return (
            Array.isArray(cond.includedNocList) &&
            cond.includedNocList.includes(occ.nocCode || "")
          );
        }
        if (cond.matchType === "TEER_RANGE") {
          return (
            cond.teer !== null &&
            cond.teer !== undefined &&
            occ.teer !== undefined &&
            occ.teer <= cond.teer
          );
        }
        if (cond.matchType === "BROAD_OCCUPATIONAL_CATEGORY") {
          return (
            occ.category === cond.occupationCategory ||
            (occ.nocCode && occ.nocCode.startsWith(cond.occupationCategory || ""))
          );
        }
        if (cond.matchType === "PRIORITY_OCCUPATION_LIST") {
          return (
            occ.isPriority ||
            (Array.isArray(cond.includedNocList) &&
              cond.includedNocList.includes(occ.nocCode || ""))
          );
        }
        if (cond.matchType === "EXCLUDED_OCCUPATION_LIST") {
          return (
            Array.isArray(cond.excludedNocList) &&
            !cond.excludedNocList.includes(occ.nocCode || "")
          );
        }
        return false;
      });
    } else {
      const applicantValue = rule.questionId
        ? answers[rule.questionId]
        : (rule.dataField ? answers[rule.dataField] : undefined);
      passed =
        applicantValue !== undefined &&
        compareValues(
          rule.operator,
          applicantValue,
          rule.comparisonValue,
          rule.secondaryValue,
        );
    }

    if (passed) {
      passedRules.push(rule);
    } else {
      failedRules.push(rule);
    }
  }

  // ---- B. Weighted scoring ----
  const scoringFactors = evaluableRules.filter(
    (r) => r.rulePurpose === "SCORING_FACTOR",
  );
  let weightedTotal = 0; // 0-100
  const lowScoringFactors: Rule[] = [];
  const highScoringFactors: Rule[] = [];

  if (scoringFactors.length === 0) {
    // For pass/fail streams with no separate scoring factors:
    // If all mandatory rules pass, score is 100%; otherwise 0%.
    weightedTotal = failedRules.length === 0 && mandatoryRules.length > 0 ? 100 : 0;
  } else {
    for (const factor of scoringFactors) {
      let factorScore0to1 = 0;

      if (factor.occupationCondition && occupations.length > 0) {
        const cond = factor.occupationCondition;
        const matchesOcc = occupations.some((occ) => {
          if (cond.matchType === "EXACT_NOC") return occ.nocCode === cond.nocCode;
          if (cond.matchType === "NOC_LIST") {
            return (
              Array.isArray(cond.includedNocList) &&
              cond.includedNocList.includes(occ.nocCode || "")
            );
          }
          if (cond.matchType === "TEER_RANGE") {
            return (
              cond.teer !== null &&
              cond.teer !== undefined &&
              occ.teer !== undefined &&
              occ.teer <= cond.teer
            );
          }
          if (cond.matchType === "BROAD_OCCUPATIONAL_CATEGORY") {
            return (
              occ.category === cond.occupationCategory ||
              (occ.nocCode && occ.nocCode.startsWith(cond.occupationCategory || ""))
            );
          }
          if (cond.matchType === "PRIORITY_OCCUPATION_LIST") {
            return (
              occ.isPriority ||
              (Array.isArray(cond.includedNocList) &&
                cond.includedNocList.includes(occ.nocCode || ""))
            );
          }
          return false;
        });
        factorScore0to1 = matchesOcc ? 1 : 0;
      } else {
        const applicantValue = factor.questionId
          ? answers[factor.questionId]
          : (factor.dataField ? answers[factor.dataField] : undefined);
        factorScore0to1 = computeFactorScore(factor, applicantValue);
      }

      weightedTotal += factorScore0to1 * (factor.weightPercentage ?? 0);

      if (factorScore0to1 < 0.6) {
        lowScoringFactors.push(factor);
      } else {
        highScoringFactors.push(factor);
      }
    }
  }


  const matchScore = Math.round(Math.min(100, Math.max(0, weightedTotal)));

  // ---- C/D. Missing requirements + improvement recommendations ----
  const missingRequirements = failedRules
    .map((r) => r.missingRequirementMessage)
    .filter((v): v is string => Boolean(v));
  const improvementRecommendations = [
    ...failedRules
      .map((r) => r.improvementRecommendation)
      .filter((v): v is string => Boolean(v)),
    ...lowScoringFactors
      .map((f) => f.improvementRecommendation)
      .filter((v): v is string => Boolean(v)),
  ];
  const strengths = [
    ...passedRules.map((r) => r.ruleName),
    ...highScoringFactors.map((f) => f.ruleName),
  ];

  // ---- G. Final category ----
  const { category, requiresFurtherReview } = classifyWithMandatoryOverride(
    matchScore,
    failedRules,
  );

  return {
    streamId: stream.id,
    streamName: stream.streamName,
    eligibilityStatus: category,
    requiresFurtherReview,
    matchScore,
    mandatoryPassCount: passedRules.length,
    mandatoryTotal: mandatoryRules.length,
    missingRequirements,
    improvementRecommendations,
    strengths,
    priorityRanking: stream.priorityRanking,
    showInFreeResults: stream.showInFreeResults,
    showInPaidReport: true,
  };
}

// ============================================================
// Section 9: ranking order across all evaluated streams
// ============================================================
const CATEGORY_RANK_ORDER: Record<MatchCategory, number> = {
  "Strong Match": 1,
  "Moderate Match": 2,
  "Fair Match": 3,
  "Improvement Required": 4,
  "Not Eligible Yet": 5,
};

function rankResults(results: StreamMatchResult[]): StreamMatchResult[] {
  return [...results].sort((a, b) => {
    const categoryDiff =
      CATEGORY_RANK_ORDER[a.eligibilityStatus] -
      CATEGORY_RANK_ORDER[b.eligibilityStatus];
    if (categoryDiff !== 0) return categoryDiff;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.priorityRanking !== a.priorityRanking)
      return b.priorityRanking - a.priorityRanking;
    return a.missingRequirements.length - b.missingRequirements.length;
  });
}

// ============================================================
// Section 10: output limits
// ============================================================
export interface ResultLimits {
  bestMatches?: number;
  improvementOpportunities?: number;
  alternativePathways?: number;
  notEligibleYetFuture?: number;
}

function applyResultLimits(
  ranked: StreamMatchResult[],
  limits: ResultLimits = {},
) {
  const {
    bestMatches = 10,
    improvementOpportunities = 3,
    alternativePathways = 3,
    notEligibleYetFuture = 3,
  } = limits;

  const strongAndModerate = ranked.filter(
    (r) =>
      r.eligibilityStatus === "Strong Match" ||
      r.eligibilityStatus === "Moderate Match",
  );
  const improvementRequired = ranked.filter(
    (r) => r.eligibilityStatus === "Improvement Required",
  );
  const fairMatch = ranked.filter((r) => r.eligibilityStatus === "Fair Match");
  const notEligibleYet = ranked.filter(
    (r) => r.eligibilityStatus === "Not Eligible Yet",
  );

  return {
    bestMatches: strongAndModerate.slice(0, bestMatches),
    improvementOpportunities: improvementRequired.slice(
      0,
      improvementOpportunities,
    ),
    alternativePathways: fairMatch.slice(0, alternativePathways),
    notEligibleYetFuture: notEligibleYet.slice(0, notEligibleYetFuture),
  };
}

// ============================================================
// Section 11: free vs paid view of a result
// ============================================================
export function toFreeResultView(result: StreamMatchResult) {
  return {
    category: result.showInFreeResults
      ? result.streamName
      : "Immigration Opportunity",
    matchScore: result.matchScore,
  };
}

export function toPaidResultView(result: StreamMatchResult) {
  return result;
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export interface RunMatchingEngineInput {
  applicantId: string;
  assessmentType: AssessmentType;
  country: string;
  answers: ApplicantAnswers;
  occupations?: ApplicantOccupation[];
  asOfDate?: Date;
  resultLimits?: ResultLimits;
  persist?: boolean;
  includeTesting?: boolean; // true only from the admin Testing Sandbox
}

export const matchingEngineService = {
  async run(input: RunMatchingEngineInput) {
    const {
      applicantId,
      assessmentType,
      country,
      answers,
      occupations = [],
      asOfDate = new Date(),
      resultLimits,
      persist = true,
      includeTesting = false,
    } = input;

    const streams = await streamService.findEvaluableStreams({
      assessmentType,
      country,
      asOfDate,
    });

    const evaluations: StreamMatchResult[] = [];
    for (const stream of streams as Array<
      Stream & { rules: (Rule & { occupationCondition?: any })[]; program: { id: string; name: string } }
    >) {
      const result = await evaluateStream(
        stream,
        answers,
        asOfDate,
        includeTesting,
        occupations,
      );
      evaluations.push({
        ...result,
        programId: stream.program.id,
        programName: stream.program.name,
      });
    }

    const ranked = rankResults(evaluations);
    const limited = applyResultLimits(ranked, resultLimits);

    if (persist && ranked.length > 0) {
      await prisma.streamEvaluationResult.createMany({
        data: ranked.map((r) => ({
          streamId: r.streamId,
          applicantId,
          eligibilityStatus: r.eligibilityStatus,
          matchScore: r.matchScore,
          mandatoryPassCount: r.mandatoryPassCount,
          mandatoryTotal: r.mandatoryTotal,
          missingRequirements: r.missingRequirements,
          improvementRecommendations: r.improvementRecommendations,
          strengths: r.strengths,
          recommendationCategory: r.eligibilityStatus,
          showInFreeResults: r.showInFreeResults,
          showInPaidReport: r.showInPaidReport,
        })),
      });
    }

    return {
      all: ranked,
      grouped: limited,
    };
  },
};
