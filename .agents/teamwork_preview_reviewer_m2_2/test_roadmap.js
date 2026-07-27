const fs = require('fs');

const roadmapPath = 'ROADMAP.md';
const content = fs.readFileSync(roadmapPath, 'utf8');

const mermaidRegex = /```mermaid([\s\S]*?)```/g;
let match;
let count = 0;
const diagrams = [];

while ((match = mermaidRegex.exec(content)) !== null) {
  count++;
  diagrams.push({ id: count, code: match[1].trim() });
}

console.log(`Found ${count} Mermaid diagrams in ${roadmapPath}.\n`);

diagrams.forEach((d) => {
  console.log(`=== Diagram #${d.id} ===`);
  const lines = d.code.split('\n');
  console.log(`First line: ${lines[0]}`);
  console.log(`Total lines: ${lines.length}`);
  console.log(`--- Content Snippet ---`);
  console.log(lines.slice(0, 10).join('\n'));
  console.log('...\n');
});
