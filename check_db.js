const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const allAssessments = await prisma.assesment.findMany({
    select: { id: true, title: true, assessmentType: true },
  });
  console.log("All assessments in DB:", allAssessments);

  const familyAssessment = allAssessments.find(
    (a) => a.id === "6a3512fa79dce42f4e5f440a" || a.title === "Family Sponsorship" || a.assessmentType === "JOIN_FAMILY_IN_CANADA"
  );

  if (familyAssessment) {
    const questions = await prisma.question.findMany({
      where: { assesmentId: familyAssessment.id },
      select: { id: true, questionId: true, questionText: true, questionType: true, order: true },
      orderBy: { order: "asc" },
    });
    const groups = await prisma.questionGroup.findMany({
      where: { assesmentId: familyAssessment.id },
    });
    console.log("Family assessment found:", familyAssessment);
    console.log("Question count:", questions.length);
    console.log("Group count:", groups.length);
    const types = Array.from(new Set(questions.map((q) => q.questionType)));
    console.log("Question types:", types);
    console.log("First 10 questions:", questions.slice(0, 10));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
