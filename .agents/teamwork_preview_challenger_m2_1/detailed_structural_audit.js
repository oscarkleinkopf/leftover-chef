const fs = require('fs');
const path = require('path');

const roadmapPath = path.join(__dirname, '..', '..', 'ROADMAP.md');
const content = fs.readFileSync(roadmapPath, 'utf8');
const lines = content.split('\n');

console.log("=== DETAILED STRUCTURAL AUDIT ===");

// 1. Heading Audit
const headings = [];
lines.forEach((line, idx) => {
  const match = line.match(/^(#{1,6})\s+(.*)$/);
  if (match) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      line: idx + 1
    });
  }
});

console.log(`Total Headings: ${headings.length}`);

// 2. Check empty sections (heading immediately followed by another heading or whitespace only)
const emptySections = [];
for (let i = 0; i < headings.length - 1; i++) {
  const curr = headings[i];
  const next = headings[i + 1];
  
  // Check lines between curr.line and next.line - 1
  let bodyLines = [];
  for (let l = curr.line; l < next.line - 1; l++) {
    const text = lines[l].trim();
    if (text.length > 0 && !text.startsWith('---')) {
      bodyLines.push(text);
    }
  }

  if (bodyLines.length === 0) {
    emptySections.push({ line: curr.line, title: curr.title });
  }
}

if (emptySections.length === 0) {
  console.log("✓ No empty sections found (all headings contain body text/diagrams/tables).");
} else {
  console.log(`❌ Found ${emptySections.length} empty sections:`);
  emptySections.forEach(s => console.log(`  Line ${s.line}: "${s.title}"`));
}

// 3. Section Word & Character Count for Section 3 (Detailed Evolutionary Phase Specifications)
console.log("\n--- SECTION 3 PHASE BREAKDOWN ---");
const phaseSections = [
  "3.1 Phase 1.0",
  "3.2 Phase 2.0",
  "3.3 Phase 3.0",
  "3.4 Phase 4.0",
  "3.5 Phase 5.0"
];

phaseSections.forEach((pName, idx) => {
  const startH = headings.find(h => h.title.includes(pName));
  if (!startH) {
    console.log(`❌ Could not find header for ${pName}`);
    return;
  }
  let endLine = lines.length;
  if (idx < phaseSections.length - 1) {
    const nextH = headings.find(h => h.title.includes(phaseSections[idx + 1]));
    if (nextH) endLine = nextH.line - 1;
  } else {
    const sec4H = headings.find(h => h.title.startsWith("4. "));
    if (sec4H) endLine = sec4H.line - 1;
  }

  const phaseContent = lines.slice(startH.line - 1, endLine).join('\n');
  const wordCount = phaseContent.split(/\s+/).filter(w => w.length > 0).length;
  const lineCount = endLine - startH.line + 1;
  
  console.log(`${startH.title} (Lines ${startH.line}-${endLine}): ${lineCount} lines, ${wordCount} words, ${phaseContent.length} chars`);
});

// 4. HTML Comment Scan for hidden placeholders
console.log("\n--- HTML COMMENT & HIDDEN PLACEHOLDER SCAN ---");
const commentMatches = [];
const commentRegex = /<!--[\s\S]*?-->/g;
let cMatch;
while ((cMatch = commentRegex.exec(content)) !== null) {
  const lineNum = content.substring(0, cMatch.index).split('\n').length;
  commentMatches.push({ line: lineNum, comment: cMatch[0] });
}

if (commentMatches.length === 0) {
  console.log("✓ No HTML comments found in ROADMAP.md.");
} else {
  console.log(`Found ${commentMatches.length} HTML comments:`);
  commentMatches.forEach(c => console.log(`  Line ${c.line}: ${c.comment}`));
}

// 5. Table of Contents vs Document Headings Alignment Check
console.log("\n--- TABLE OF CONTENTS ALIGNMENT CHECK ---");
const tocSection = lines.slice(10, 46).join('\n');
const tocMatches = [...tocSection.matchAll(/\[(.*?)\]\(#(.*?)\)/g)];
console.log(`TOC items count: ${tocMatches.length}`);

let unlinkedTocItems = 0;
tocMatches.forEach(t => {
  const titleText = t[1];
  const foundHeading = headings.find(h => {
    // Basic match
    const cleanTitle = h.title.replace(/[^\w\s\.-]/g, '').toLowerCase();
    const cleanToc = titleText.replace(/[^\w\s\.-]/g, '').toLowerCase();
    return h.title.includes(titleText) || cleanTitle.includes(cleanToc);
  });
  if (!foundHeading) {
    console.log(`⚠️ TOC item "${titleText}" might not match document heading exactly.`);
    unlinkedTocItems++;
  }
});
if (unlinkedTocItems === 0) {
  console.log("✓ All Table of Contents entries match document headings.");
}

// Write detailed audit JSON
fs.writeFileSync(
  path.join(__dirname, 'structural_audit.json'),
  JSON.stringify({ headingsCount: headings.length, emptySections, commentMatches }, null, 2),
  'utf8'
);
