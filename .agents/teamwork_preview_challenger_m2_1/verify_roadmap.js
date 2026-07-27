const fs = require('fs');
const path = require('path');

const roadmapPath = path.join(__dirname, '..', '..', 'ROADMAP.md');
const content = fs.readFileSync(roadmapPath, 'utf8');
const lines = content.split('\n');

console.log(`ROADMAP.md loaded. Total lines: ${lines.length}, Total bytes: ${content.length}`);

// 1. Check for Placeholder text
const placeholderRegex = /\b(TBD|TODO|FIXME|XXX|WIP|TBA|PLACEHOLDER|COMING SOON)\b/gi;
const bracketPlaceholderRegex = /\[\.\.\.\]|\[TBD\]|\[TODO\]/gi;

console.log('\n--- 1. PLACEHOLDER & INCOMPLETENESS SCAN ---');
let placeholderMatches = [];

lines.forEach((line, index) => {
  let match;
  while ((match = placeholderRegex.exec(line)) !== null) {
    // Exclude false positives like TBD if used in legitimate context (though unlikely)
    placeholderMatches.push({ line: index + 1, match: match[0], text: line.trim() });
  }
  while ((match = bracketPlaceholderRegex.exec(line)) !== null) {
    placeholderMatches.push({ line: index + 1, match: match[0], text: line.trim() });
  }
});

if (placeholderMatches.length === 0) {
  console.log('✓ No placeholder keywords (TBD, TODO, FIXME, XXX, WIP, TBA, etc.) found in ROADMAP.md.');
} else {
  console.log(`❌ Found ${placeholderMatches.length} placeholder occurrences:`);
  placeholderMatches.forEach(p => {
    console.log(`  Line ${p.line}: "${p.match}" -> ${p.text}`);
  });
}

// 2. Check completeness of Required Phases (v2.0, v3.0, v4.0, v5.0)
console.log('\n--- 2. REQUIRED PHASES STRUCTURAL CHECK ---');
const requiredPhases = [
  { id: 'v2.0', title: 'Phase 2.0', sectionRegex: /3\.2\s+Phase 2\.0/i },
  { id: 'v3.0', title: 'Phase 3.0', sectionRegex: /3\.3\s+Phase 3\.0/i },
  { id: 'v4.0', title: 'Phase 4.0', sectionRegex: /3\.4\s+Phase 4\.0/i },
  { id: 'v5.0', title: 'Phase 5.0', sectionRegex: /3\.5\s+Phase 5\.0/i }
];

requiredPhases.forEach(phase => {
  const lineIdx = lines.findIndex(l => phase.sectionRegex.test(l));
  if (lineIdx !== -1) {
    console.log(`✓ Found section for ${phase.title} at line ${lineIdx + 1}`);
  } else {
    console.log(`❌ MISSING section for ${phase.title}!`);
  }
});

// 3. Extract Mermaid Diagrams
console.log('\n--- 3. MERMAID DIAGRAM EXTRACTION ---');
const mermaidBlockRegex = /```mermaid\r?\n([\s\S]*?)```/g;
let mermaidBlocks = [];
let mMatch;
let blockIndex = 0;

while ((mMatch = mermaidBlockRegex.exec(content)) !== null) {
  blockIndex++;
  const blockContent = mMatch[1];
  const startPos = mMatch.index;
  const lineNum = content.substring(0, startPos).split('\n').length;
  mermaidBlocks.push({
    id: blockIndex,
    startLine: lineNum,
    code: blockContent
  });
}

console.log(`Found ${mermaidBlocks.length} Mermaid code blocks in ROADMAP.md.`);

const diagramsDir = path.join(__dirname, 'diagrams');
if (!fs.existsSync(diagramsDir)) {
  fs.mkdirSync(diagramsDir, { recursive: true });
}

mermaidBlocks.forEach(b => {
  const diagramType = b.code.trim().split('\n')[0].trim();
  console.log(`Diagram #${b.id} starting at line ${b.startLine}: Header = "${diagramType}"`);
  fs.writeFileSync(path.join(diagramsDir, `diagram_${b.id}.mmd`), b.code, 'utf8');
});

// Save extraction summary
fs.writeFileSync(
  path.join(__dirname, 'scan_results.json'),
  JSON.stringify({ placeholderMatches, mermaidBlocksCount: mermaidBlocks.length }, null, 2),
  'utf8'
);
