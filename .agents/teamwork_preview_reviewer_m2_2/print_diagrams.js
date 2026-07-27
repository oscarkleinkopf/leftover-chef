const fs = require('fs');

const content = fs.readFileSync('ROADMAP.md', 'utf8');
const mermaidRegex = /```mermaid([\s\S]*?)```/g;
let match;
let count = 0;

while ((match = mermaidRegex.exec(content)) !== null) {
  count++;
  console.log(`\n========================================`);
  console.log(`MERMAID DIAGRAM #${count}`);
  console.log(`========================================\n`);
  console.log(match[1].trim());
}
