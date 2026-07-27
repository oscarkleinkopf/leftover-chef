const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('ROADMAP.md', 'utf8');
const mermaidRegex = /```mermaid([\s\S]*?)```/g;
let match;
let count = 0;

const dir = path.join('.agents', 'teamwork_preview_reviewer_m2_2', 'diagrams');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

while ((match = mermaidRegex.exec(content)) !== null) {
  count++;
  const diagramCode = match[1].trim();
  const filePath = path.join(dir, `diagram_${count}.mmd`);
  fs.writeFileSync(filePath, diagramCode, 'utf8');
  console.log(`Saved ${filePath}`);
}
