const fs = require('fs');

const content = fs.readFileSync('ROADMAP.md', 'utf8');
const lines = content.split('\n');

const issues = [];

// 1. Heading hierarchy check
let lastHeadingLevel = 0;
const headings = [];

lines.forEach((line, idx) => {
  const match = line.match(/^(#+)\s+(.*)/);
  if (match) {
    const level = match[1].length;
    const title = match[2];
    headings.push({ line: idx + 1, level, title });
    
    if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
      issues.push(`Heading jump at line ${idx + 1}: H${lastHeadingLevel} -> H${level} ("${title}")`);
    }
    lastHeadingLevel = level;
  }
});

// 2. TOC Anchor check
const tocRegex = /\[([^\]]+)\]\(#([^\)]+)\)/g;
let tocMatch;
const anchors = new Set();
headings.forEach(h => {
  // convert title to github markdown anchor format
  const anchor = h.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  anchors.add(anchor);
});

lines.forEach((line, idx) => {
  // only check TOC area (lines 10-46)
  if (idx >= 9 && idx <= 46) {
    let m;
    while ((m = tocRegex.exec(line)) !== null) {
      const text = m[1];
      const targetAnchor = m[2];
      // check if targetAnchor exists or close match
      if (!anchors.has(targetAnchor)) {
        issues.push(`TOC link at line ${idx + 1} has target anchor '#${targetAnchor}' which might not match exact heading anchor.`);
      }
    }
  }
});

// 3. Code block tags check
let inCodeBlock = false;
let blockLang = '';
let blockStartLine = 0;

lines.forEach((line, idx) => {
  if (line.startsWith('```')) {
    if (!inCodeBlock) {
      inCodeBlock = true;
      blockLang = line.slice(3).trim();
      blockStartLine = idx + 1;
      if (!blockLang) {
        issues.push(`Untagged code block starting at line ${idx + 1}`);
      }
    } else {
      inCodeBlock = false;
    }
  }
});

if (inCodeBlock) {
  issues.push(`Unclosed code block starting at line ${blockStartLine}`);
}

// 4. Table column alignment check
let inTable = false;
let tableStartLine = 0;
let expectedCols = 0;

lines.forEach((line, idx) => {
  const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');
  if (isTableLine) {
    const cols = line.split('|').length - 2;
    if (!inTable) {
      inTable = true;
      tableStartLine = idx + 1;
      expectedCols = cols;
    } else {
      if (cols !== expectedCols) {
        issues.push(`Table column mismatch at line ${idx + 1}: expected ${expectedCols} columns, found ${cols}`);
      }
    }
  } else {
    inTable = false;
  }
});

console.log('=== MARKDOWN AUDIT RESULTS ===');
console.log(`Total lines: ${lines.length}`);
console.log(`Total headings: ${headings.length}`);
console.log(`Total issues found: ${issues.length}\n`);

issues.forEach((iss, i) => {
  console.log(`${i + 1}. ${iss}`);
});

fs.writeFileSync(
  '.agents/teamwork_preview_reviewer_m2_2/markdown_audit.json',
  JSON.stringify({ headings, issues }, null, 2),
  'utf8'
);
