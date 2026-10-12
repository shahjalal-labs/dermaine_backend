const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

async function main() {
  const familyAssessmentId = "6a3512fa79dce42f4e5f440a";
  const [questions, groups] = await Promise.all([
    prisma.question.findMany({
      where: { assesmentId: familyAssessmentId },
      include: {
        options: { orderBy: { id: "asc" } },
        dependsOnQuestion: {
          select: { id: true, questionId: true, questionText: true },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.questionGroup.findMany({
      where: { assesmentId: familyAssessmentId },
      orderBy: { order: "asc" },
    }),
  ]);

  fs.writeFileSync(
    "family_questions_dump.json",
    JSON.stringify({ questions, groups }, null, 2)
  );
  console.log(`Dumped ${questions.length} questions and ${groups.length} groups to family_questions_dump.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
