import { PrismaClient, Question, Prisma, SubmissionStatus } from "@prisma/client";
import {
  matchingEngineService,
  RunMatchingEngineInput,
  compareValues,
  ApplicantAnswers,
} from "../matchEngine.service";

const prisma = new PrismaClient();

export interface SubmitAssessmentInput {
  applicantId?: string;
  assesmentId: string;
  country: string;
  answers: Record<string, unknown>;
  occupations?: Array<{
    questionId?: string;
    questionDbId?: string;
    occupationTitle?: string;
    nocCode?: string;
    teer?: number;
    category?: string;
    isPriority?: boolean;
    groupKey?: string;
    instanceIndex?: number;
  }>;
  resultLimits?: RunMatchingEngineInput["resultLimits"];
}

export interface SubmitAssessmentResult {
  submissionId: string;
  droppedAnswers: string[];
  missingRequired: string[];
  matchResults?: Awaited<ReturnType<typeof matchingEngineService.run>>;
}

const slugMap: Record<string, string> = {
  "permanent-residence": "6a3512fa79dce42f4e5f4407",
  "study": "6a3512fa79dce42f4e5f4408",
  "work": "6a3512fa79dce42f4e5f4409",
  "family": "6a3512fa79dce42f4e5f440a",
  "study-permit": "6a3512fa79dce42f4e5f4408",
  "work-permit": "6a3512fa79dce42f4e5f4409",
  "family-sponsorship": "6a3512fa79dce42f4e5f440a",
};

// ============================================================
// Recomputes which questions SHOULD be visible given the submitted
// answers — never trusts the frontend's hide/show state.
//
// SIMPLIFIED vs the slug-based version: dependsOnQuestionId is
// already a real Question._id, and answers are now keyed by _id
// too — so no more idToSlug translation step. Visibility is tracked
// directly by Question.id throughout.
// ============================================================
function resolveVisibleQuestions(
  questions: Question[],
  answersByQuestionId: Record<string, unknown>,
): Set<string> {
  const visible = new Set<string>();

  let addedAny = true;
  while (addedAny) {
    addedAny = false;

    for (const q of questions) {
      if (visible.has(q.id)) continue;

      if (!q.dependsOnQuestionId) {
        visible.add(q.id);
        addedAny = true;
        continue;
      }

      if (!visible.has(q.dependsOnQuestionId)) continue; // parent not resolved yet, or invalid

      const parentAnswer = answersByQuestionId[q.dependsOnQuestionId];
      const conditionMet = compareValues(
        q.dependsOnOperator!,
        parentAnswer,
        q.dependsOnValue ?? null,
        null, // BETWEEN still unsupported for question dependencies — same gap as before
      );

      if (conditionMet) {
        visible.add(q.id);
        addedAny = true;
      }
    }
  }

  return visible;
}

export const submissionService = {
  async submitAssessment(
    applicantId: string,
    input: SubmitAssessmentInput,
  ): Promise<SubmitAssessmentResult> {
    let assesmentId = input.assesmentId || (input as any).assessmentId;
    const country = input.country || "Canada";
    const rawAnswers = input.answers || {};
    const occupations = input.occupations || [];
    const resultLimits = input.resultLimits;

    if (!assesmentId) {
      throw new Error("assesmentId (or assessmentId) is required");
    }

    if (slugMap[assesmentId]) {
      assesmentId = slugMap[assesmentId];
    } else if (!/^[0-9a-fA-F]{24}$/.test(assesmentId)) {
      const found = await prisma.assesment.findFirst({
        where: {
          OR: [{ title: { equals: assesmentId, mode: "insensitive" } }],
        },
      });
      if (found) assesmentId = found.id;
    }

    const assesment = await prisma.assesment.findUnique({
      where: { id: assesmentId },
    });
    if (!assesment) {
      throw new Error(`Assesment with id ${assesmentId} not found`);
    }

    let assessmentType = (assesment as any).assessmentType;
    if (!assessmentType) {
      if (assesment.title.toLowerCase().includes("study")) {
        assessmentType = "STUDY_IN_CANADA";
      } else if (assesment.title.toLowerCase().includes("work")) {
        assessmentType = "WORK_IN_CANADA";
      } else if (assesment.title.toLowerCase().includes("family")) {
        assessmentType = "JOIN_FAMILY_IN_CANADA";
      } else {
        assessmentType = "APPLY_FOR_PERMANENT_RESIDENCE";
      }
    }

    const [questions, questionGroups] = await Promise.all([
      prisma.question.findMany({ where: { assesmentId } }),
      prisma.questionGroup.findMany({ where: { assesmentId } }),
    ]);

    const repeatableGroupKeys = new Set(
      questionGroups.filter((g) => g.isRepeatable).map((g) => g.groupKey),
    );
    const groupById = new Map(questionGroups.map((g) => [g.id, g]));
    const questionByQuestionId = new Map(questions.map((q) => [q.questionId, q]));

    // Extract repeatable group data if submitted (e.g. answers["children"] = [...])
    const groupSubmissions: Record<string, Record<string, unknown>[]> = {};
    const flatAnswers: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawAnswers)) {
      if (repeatableGroupKeys.has(key) && Array.isArray(value)) {
        groupSubmissions[key] = value as Record<string, unknown>[];
      } else {
        const matched = questionByQuestionId.get(key) || questions.find((q) => q.id === key);
        if (matched) {
          flatAnswers[matched.id] = value;
          flatAnswers[matched.questionId] = value;
        } else {
          flatAnswers[key] = value;
        }
      }
    }

    // Early exit check for JOIN_FAMILY_IN_CANADA:
    // If applicant answers false to "Do you have a family member currently living in Canada?",
    // the assessment terminates immediately with no further required questions.
    const rootFamilyGate = questions.find(
      (q) =>
        q.questionText.toLowerCase().includes("family member currently living in canada") ||
        q.questionId === "question_1786528385298",
    );
    const isFamilyEarlyExit =
      assessmentType === "JOIN_FAMILY_IN_CANADA" &&
      rootFamilyGate &&
      (flatAnswers[rootFamilyGate.id] === false ||
        flatAnswers[rootFamilyGate.id] === "false" ||
        String(flatAnswers[rootFamilyGate.id]).trim().toLowerCase() === "no");

    const visibleQuestionIds = isFamilyEarlyExit
      ? new Set([rootFamilyGate.id])
      : resolveVisibleQuestions(questions, flatAnswers);

    // Drop any submitted answer for a question that isn't actually visible.
    const droppedAnswers: string[] = [];
    const visibleAnswers: Record<string, unknown> = {};

    for (const [questionId, value] of Object.entries(flatAnswers)) {
      if (visibleQuestionIds.has(questionId)) {
        visibleAnswers[questionId] = value;
      } else {
        droppedAnswers.push(questionId);
      }
    }

    // Process repeatable group instances if gate is open and data is present
    for (const [groupKey, instances] of Object.entries(groupSubmissions)) {
      const group = questionGroups.find((g) => g.groupKey === groupKey);
      if (!group) continue;

      const groupQuestions = questions.filter((q) => q.groupId === group.id);
      const groupQByQuestionId = new Map(groupQuestions.map((q) => [q.questionId, q]));

      for (const instance of instances) {
        for (const [rawQKey, val] of Object.entries(instance)) {
          const matchedQ = groupQByQuestionId.get(rawQKey) || groupQuestions.find((q) => q.id === rawQKey);
          const qId = matchedQ ? matchedQ.id : rawQKey;
          if (visibleQuestionIds.has(qId)) {
            // Aggregate or set value
            if (visibleAnswers[qId] === undefined) {
              visibleAnswers[qId] = val;
            } else if (Array.isArray(visibleAnswers[qId])) {
              (visibleAnswers[qId] as unknown[]).push(val);
            } else {
              visibleAnswers[qId] = [visibleAnswers[qId], val];
            }
          }
        }
      }
    }

    const questionById = new Map(questions.map((q) => [q.id, q]));

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.assessmentSubmission.create({
        data: {
          applicantId,
          assesmentId,
          status: "COMPLETED",
          submittedAt: new Date(),
        },
      });

      // Filter only real question IDs in database to prevent foreign key errors on client patches
      const validEntries = Object.entries(visibleAnswers).filter(([id]) => questionById.has(id));

      const answerRows: Prisma.AssessmentAnswerCreateManyInput[] =
        validEntries.map(([id, value]) => ({
          submissionId: created.id,
          questionId: id,
          value: (value !== undefined ? value : null) as Prisma.InputJsonValue,
        }));

      if (answerRows.length > 0) {
        await tx.assessmentAnswer.createMany({ data: answerRows });
      }

      return created;
    });

    // Run matching engine
    const matchResults = await matchingEngineService.run({
      applicantId,
      assessmentType,
      country,
      answers: visibleAnswers as ApplicantAnswers,
      occupations,
      resultLimits,
    });

    return {
      submissionId: submission.id,
      droppedAnswers,
      missingRequired: [],
      matchResults,
    };
  },

  async getApplicantResults(applicantId: string | string[]) {
    const ids = Array.isArray(applicantId) ? applicantId : [applicantId];
    return prisma.streamEvaluationResult.findMany({
      where: { applicantId: { in: ids } },
      include: {
        stream: {
          include: {
            program: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { matchScore: "desc" },
    });
  },

  async getApplicantSubmissions(applicantId: string | string[]) {
    const ids = Array.isArray(applicantId) ? applicantId : [applicantId];
    return prisma.assessmentSubmission.findMany({
      where: { applicantId: { in: ids } },
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
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async saveDraft(
    applicantId: string,
    input: {
      assessmentId?: string;
      answers?: Record<string, unknown>;
      currentStepPath?: string;
      progress?: number;
    }
  ) {
    let assesment = null;

    if (input.assessmentId) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(input.assessmentId);
      if (isObjectId) {
        assesment = await prisma.assesment.findUnique({
          where: { id: input.assessmentId },
        });
      }
      if (!assesment) {
        assesment = await prisma.assesment.findFirst({
          where: {
            title: { contains: input.assessmentId, mode: "insensitive" },
          },
        });
      }
    }

    if (!assesment) {
      assesment = await prisma.assesment.findFirst({
        where: {
          OR: [
            { assessmentType: "APPLY_FOR_PERMANENT_RESIDENCE" },
            { title: { contains: "Permanent Residence", mode: "insensitive" } },
          ],
        },
      });
    }

    if (!assesment) {
      assesment = await prisma.assesment.findFirst();
    }

    if (!assesment) {
      throw new Error("No assessment found to create draft");
    }

    // Check if IN_PROGRESS submission exists for this applicant & assessment
    let submission = await prisma.assessmentSubmission.findFirst({
      where: {
        applicantId,
        assesmentId: assesment.id,
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    if (!submission) {
      submission = await prisma.assessmentSubmission.create({
        data: {
          applicantId,
          assesmentId: assesment.id,
          status: SubmissionStatus.IN_PROGRESS,
        },
      });
    } else {
      submission = await prisma.assessmentSubmission.update({
        where: { id: submission.id },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return submission;
  },

  async getSubmissionById(id: string) {
    return prisma.assessmentSubmission.findUnique({
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
  },
};
