const fs = require("fs");

const data = JSON.parse(fs.readFileSync("family_questions_dump.json", "utf8"));
const { questions, groups } = data;

console.log("=== GROUPS ===");
groups.forEach(g => console.log(g.id, g.groupKey, g.title, "repeatable:", g.isRepeatable));

console.log("\n=== QUESTIONS BY SECTION ===");
const byType = {};
questions.forEach(q => {
  if (!byType[q.questionType]) byType[q.questionType] = [];
  byType[q.questionType].push(q);
});

for (const [type, qList] of Object.entries(byType)) {
  console.log(`\n--- Section: ${type} (${qList.length} questions) ---`);
  qList.forEach(q => {
    const dep = q.dependsOnQuestionId ? ` [depends on ${q.dependsOnQuestion?.questionText || q.dependsOnQuestionId} ${q.dependsOnOperator} ${q.dependsOnValue}]` : "";
    const opts = q.options && q.options.length ? ` (options: ${q.options.map(o => o.label).join(", ")})` : "";
    console.log(`  [order ${q.order}] (${q.inputType}) ${q.questionText}${opts}${dep}`);
  });
}
