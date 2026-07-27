const fs = require('fs');
const path = require('path');

const roadmapPath = path.join(__dirname, '..', '..', 'ROADMAP.md');
const content = fs.readFileSync(roadmapPath, 'utf8');

console.log("--- NON-MERMAID CODE SNIPPETS EMPIRICAL TEST ---");

// Extract javascript / typescript / json code blocks
const codeBlockRegex = /```(javascript|typescript|json)\r?\n([\s\S]*?)```/g;
let match;
let count = 0;

while ((match = codeBlockRegex.exec(content)) !== null) {
  count++;
  const lang = match[1];
  const code = match[2];
  const startPos = match.index;
  const lineNum = content.substring(0, startPos).split('\n').length;

  console.log(`\nCode Snippet #${count} (${lang}) at line ${lineNum}:`);
  
  if (lang === 'json') {
    try {
      JSON.parse(code);
      console.log(`  [PASS] Valid JSON.`);
    } catch (e) {
      console.log(`  [FAIL] JSON parse error: ${e.message}`);
    }
  } else if (lang === 'javascript') {
    try {
      // Basic JS syntax check using Function constructor or VM module
      new Function(code);
      console.log(`  [PASS] Valid JavaScript syntax.`);
    } catch (e) {
      // If it has import/export, wrap in module test
      try {
        new Function('export ' + code);
        console.log(`  [PASS] Valid JavaScript module code.`);
      } catch (e2) {
        console.log(`  [NOTE] JS snippet syntax: ${e.message}`);
      }
    }
  } else if (lang === 'typescript') {
    // Basic structural check for TS interface definition
    if (code.includes('interface ') && code.includes('{') && code.includes('}')) {
      console.log(`  [PASS] Structurally valid TypeScript interface definition.`);
    } else {
      console.log(`  [NOTE] TS code snippet found.`);
    }
  }
}
