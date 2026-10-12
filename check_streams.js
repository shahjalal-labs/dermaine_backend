const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const streams = await prisma.stream.findMany({
    where: { assessmentTypes: { has: "JOIN_FAMILY_IN_CANADA" } },
    include: { rules: true },
  });
  for (const s of streams) {
    console.log(`\nStream: ${s.streamName} (id: ${s.id})`);
    for (const r of s.rules) {
      console.log(`  Rule: ${r.ruleName} | Q: ${r.questionId} | Op: ${r.operator} | Val: ${r.value}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
