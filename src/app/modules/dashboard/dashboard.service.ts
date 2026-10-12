import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";

/**
 * Get unified dashboard statistics for a logged-in user
 */
const getUserDashboardStats = async (userId: string, email?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applicantIds = [userId];
  if (email && email !== userId) {
    applicantIds.push(email);
  }
  if (user.email && !applicantIds.includes(user.email)) {
    applicantIds.push(user.email);
  }

  // 1. Fetch Assessment Submissions
  const submissions = await prisma.assessmentSubmission.findMany({
    where: {
      applicantId: { in: applicantIds },
    },
    include: {
      assesment: {
        select: {
          id: true,
          title: true,
          assessmentType: true,
        },
      },
      answers: {
        take: 5,
        include: {
          question: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 2. Fetch Stream Evaluation Results
  const evaluationResults = await prisma.streamEvaluationResult.findMany({
    where: {
      applicantId: { in: applicantIds },
    },
    include: {
      stream: {
        include: {
          program: true,
        },  
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch User Consultations
  const consultations = await prisma.consultation.findMany({
    where: { userId },
    orderBy: { scheduledAt: "desc" },
  });

  // Calculations
  const totalAssessments = submissions.length;
  const completedSubmissions = submissions.filter((s) => s.status === "COMPLETED");
  const inProgressSubmissions = submissions.filter((s) => s.status === "IN_PROGRESS");

  // Recent score calculation
  let recentScore = "---";
  if (evaluationResults.length > 0) {
    const highestScore = Math.max(...evaluationResults.map((r) => r.matchScore));
    recentScore = `${Math.round(highestScore)}%`;
  } else if (completedSubmissions.length > 0) {
    recentScore = "100%";
  }

  // Eligible pathway matches
  const eligibleMatches = evaluationResults.filter(
    (r) => r.eligibilityStatus !== "NOT_ELIGIBLE" && r.eligibilityStatus !== "Not Eligible Yet"
  );
  const pathwayMatchesCount = eligibleMatches.length > 0 ? eligibleMatches.length : evaluationResults.length;

  // Reports generated
  const reportsGeneratedCount = completedSubmissions.length > 0 ? completedSubmissions.length : (evaluationResults.length > 0 ? 1 : 0);

  // Recent formatted assessments
  const recentAssessments = submissions.slice(0, 5).map((s) => {
    const dt = new Date(s.updatedAt || s.createdAt);
    const dateFormatted = dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const matchingEval = evaluationResults.find((e) => e.createdAt >= s.createdAt);
    const score = matchingEval
      ? `${Math.round(matchingEval.matchScore)}%`
      : s.status === "COMPLETED"
      ? "Completed"
      : "---";

    return {
      id: s.id,
      assessmentId: s.assesmentId,
      title: s.assesment?.title || "Immigration Assessment",
      type: s.assesment?.assessmentType || "Permanent Residence",
      date: dateFormatted,
      status: s.status === "COMPLETED" ? "Completed" : "In progress",
      score,
      report: s.status === "COMPLETED" ? "Available" : "---",
      updatedAt: s.updatedAt,
    };
  });

  // Latest In-Progress Assessment
  const latestInProgress = inProgressSubmissions[0]
    ? {
        id: inProgressSubmissions[0].id,
        assessmentId: inProgressSubmissions[0].assesmentId,
        title: inProgressSubmissions[0].assesment?.title || "Immigration Assessment",
        progress: 65,
        updatedAt: inProgressSubmissions[0].updatedAt
          ? inProgressSubmissions[0].updatedAt.toISOString()
          : new Date().toISOString(),
      }
    : null;

  // Profile Completeness
  let completenessScore = 40;
  if (user.fullName) completenessScore += 20;
  if (user.phoneNumber) completenessScore += 15;
  if (submissions.length > 0) completenessScore += 15;
  if (consultations.length > 0) completenessScore += 10;
  completenessScore = Math.min(100, completenessScore);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
    },
    metrics: {
      totalAssessments: String(totalAssessments).padStart(2, "0"),
      recentScore,
      reportsGenerated: String(reportsGeneratedCount).padStart(2, "0"),
      pathwayMatches: String(pathwayMatchesCount).padStart(2, "0"),
      profileCompleteness: completenessScore,
    },
    recentAssessments,
    latestInProgress,
    consultations: consultations.slice(0, 3).map((c) => ({
      id: c.id,
      type: c.consultationType === "THIRTY_MINUTES" ? "30-Min Session" : "60-Min Session",
      mode: c.consultationMode,
      date: new Date(c.scheduledAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      status: c.status,
      teamsJoinUrl: c.teamsJoinUrl,
    })),
  };
};

/**
 * Get user pathway matches
 */
const getUserPathwayMatches = async (
  userId: string,
  email?: string,
  applicantIdParam?: string
) => {
  const applicantIds = [userId];
  if (email && email !== userId) applicantIds.push(email);
  if (applicantIdParam && !applicantIds.includes(applicantIdParam)) {
    applicantIds.push(applicantIdParam);
  }

  const evaluationResults = await prisma.streamEvaluationResult.findMany({
    where: {
      applicantId: { in: applicantIds },
    },
    include: {
      stream: {
        include: {
          program: true,
        },
      },
    },
    orderBy: { matchScore: "desc" },
  });

  // If user already has evaluation results from backend engine
  if (evaluationResults.length > 0) {
    return evaluationResults.map((item) => {
      const stream = item.stream;
      return {
        id: item.id,
        streamId: stream?.id,
        name: stream?.streamName || stream?.program?.name || "Canadian Immigration Stream",
        category: stream?.program?.category || "Express Entry",
        categoryLabel: stream?.program?.name || "Provincial Nominee (PNP)",
        province: stream?.provinceRegion || stream?.country || "Canada",
        matchScore: Math.round(item.matchScore),
        eligibilityStatus: item.eligibilityStatus,
        processingTime: stream?.processingTime || "3 - 6 Months",
        applicationFee: "$1,365 CAD",
        description: stream?.publicSummary || stream?.description || "Evaluation completed for this pathway.",
        educationRequirement: stream?.educationRequirementSummary || "Post-secondary credential with ECA",
        languageRequirement: stream?.languageRequirementSummary || "CLB 7 minimum in English or French",
        experienceRequirement: stream?.workExperienceRequirementSummary || "Minimum 1 year relevant work experience",
        jobOfferRequired: Boolean(stream?.jobOfferRequirementSummary && !stream.jobOfferRequirementSummary.toLowerCase().includes("not required")),
        keyHighlights: item.strengths?.length > 0 ? item.strengths : [
          "Requirements evaluated against program rules",
          "Comprehensive Ranking System baseline met",
        ],
        missingRequirements: item.missingRequirements || [],
        improvementRecommendations: item.improvementRecommendations || [],
        whyMatched: item.recommendationCategory || (item.eligibilityStatus === "ELIGIBLE" ? "Profile meets the core stream qualifications." : "Profile shows strong potential alignment with this pathway."),
      };
    });
  }

  // Fallback: Return active system streams
  const activeStreams = await prisma.stream.findMany({
    where: {
      status: "ACTIVE",
      isArchived: false,
    },
    take: 8,
    include: {
      program: true,
    },
    orderBy: { priorityRanking: "desc" },
  });

  return activeStreams.map((s, idx) => ({
    id: s.id,
    streamId: s.id,
    name: s.streamName,
    category: s.program?.category || "Express Entry",
    categoryLabel: s.program?.name || "Provincial Nominee",
    province: s.provinceRegion || "Canada",
    matchScore: Math.max(65, 92 - idx * 4),
    eligibilityStatus: "POTENTIALLY_ELIGIBLE",
    processingTime: s.processingTime || "3 - 6 Months",
    applicationFee: "$1,500 CAD",
    description: s.description || s.publicSummary || "Active pathway stream for eligible applicants.",
    keyHighlights: [
      s.languageRequirementSummary || "Language test required (CLB 7+)",
      s.educationRequirementSummary || "Post-secondary credential with ECA",
      s.workExperienceRequirementSummary || "1+ year relevant skilled work experience",
    ],
    missingRequirements: [],
    improvementRecommendations: [],
    whyMatched: "Based on general eligibility for Canadian skilled worker and provincial programs.",
  }));
};

/**
 * Get user purchase history & invoices
 */
const getUserPurchaseHistory = async (userId: string) => {
  const consultations = await prisma.consultation.findMany({
    where: {
      userId,
      amountPaid: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
  });

  const purchases = consultations.map((c, i) => {
    const created = new Date(c.createdAt);
    const dateFormatted = created.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      id: c.id,
      invoice: c.stripePaymentId ? `INV-${created.getFullYear()}-${c.id.slice(-4).toUpperCase()}` : `INV-2026-${String(i + 42).padStart(4, "0")}`,
      date: dateFormatted,
      amount: `$${c.amountPaid.toFixed(2)}`,
      rawAmount: c.amountPaid,
      assessment: c.consultationType === "THIRTY_MINUTES" ? "30-Min Strategy Consultation" : "60-Min Comprehensive Review",
      consultation: c.status === "CONFIRMED" ? "Booked" : c.status === "COMPLETED" ? "Finished" : "--",
      reportDate: dateFormatted,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
    };
  });

  const totalSpent = purchases.reduce((sum, item) => sum + item.rawAmount, 0);

  return {
    purchases,
    stats: {
      totalSpent: `$${totalSpent.toFixed(2)}`,
      reportsGenerated: purchases.length > 0 ? purchases.length : 0,
      latestPurchase: purchases[0]?.date || "---",
    },
  };
};

/**
 * Get comprehensive Immigration Profile for a user
 */
const getUserImmigrationProfile = async (userId: string, email?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      profileImage: true,
      address: true,
      gender: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applicantIds = [userId];
  if (email && email !== userId) applicantIds.push(email);

  // Find latest assessment submission and extract answers
  const latestSubmission = await prisma.assessmentSubmission.findFirst({
    where: {
      applicantId: { in: applicantIds },
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Extract answers by question key or question text
  const answersMap: Record<string, any> = {};
  if (latestSubmission?.answers) {
    latestSubmission.answers.forEach((ans: any) => {
      const qKey = ans.question?.questionId || ans.questionId;
      answersMap[qKey] = ans.value;
    });
  }

  const nameParts = (user.fullName || "User").trim().split(" ");
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    overview: {
      id: user.id,
      fullName: user.fullName || "Candidate",
      firstName,
      lastName,
      email: user.email,
      phone: user.phoneNumber || "Not provided",
      occupation: answersMap["noc_job_title"] || answersMap["occupation"] || "Software Engineer",
      yearsExperience: answersMap["years_experience"] || "4 yrs exp",
      country: answersMap["country_of_residence"] || "Canada",
      targetProvince: answersMap["target_province"] || "Ontario",
      targetGoal: answersMap["immigration_goal"] || "Permanent Residence",
      completeness: 85,
    },
    personalInformation: {
      firstName,
      lastName,
      countryOfResidence: answersMap["country_of_residence"] || "Canada",
      citizenship: answersMap["citizenship"] || "Not specified",
      maritalStatus: answersMap["marital_status"] || "Single",
      dependants: answersMap["dependants_count"] || "0",
    },
    educationAndOccupation: {
      highestEducation: answersMap["education_level"] || "Bachelor's Degree",
      fieldOfStudy: answersMap["field_of_study"] || "Computer Science",
      institutionName: answersMap["institution_name"] || "University",
      graduationYear: answersMap["graduation_year"] || "2020",
    },
    workExperience: {
      occupationTitle: answersMap["noc_job_title"] || answersMap["occupation"] || "Software Engineer",
      nocCode: answersMap["noc_code"] || "21232",
      yearsOfExperience: answersMap["years_experience"] || "4 years",
      currentlyEmployed: answersMap["currently_employed"] !== undefined ? String(answersMap["currently_employed"]) : "Yes",
      canadianWorkExperience: answersMap["canadian_experience"] || "No",
      canadianJobOffer: answersMap["job_offer"] || "No",
    },
    languageScores: {
      test: answersMap["language_test"] || "IELTS",
      listening: answersMap["lang_listening"] || "7.5",
      reading: answersMap["lang_reading"] || "7.0",
      writing: answersMap["lang_writing"] || "6.5",
      speaking: answersMap["lang_speaking"] || "7.0",
    },
    immigrationGoals: {
      primaryGoal: answersMap["immigration_goal"] || "Permanent Residence",
      targetProvince: answersMap["target_province"] || "Ontario",
      targetTimeline: answersMap["target_timeline"] || "1-2 years",
      familyInCanada: answersMap["family_in_canada"] || "No",
    },
  };
};

export const userDashboardService = {
  getUserDashboardStats,
  getUserPathwayMatches,
  getUserPurchaseHistory,
  getUserImmigrationProfile,
};
