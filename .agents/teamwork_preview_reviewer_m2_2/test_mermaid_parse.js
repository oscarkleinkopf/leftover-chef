const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Write a small html file loading mermaid from cdn or local bundle to test parsing via jsdom or node script
const diagramsDir = path.join('.agents', 'teamwork_preview_reviewer_m2_2', 'diagrams');

console.log('Testing diagram parsing with lightweight node script...\n');

for (let i = 1; i <= 9; i++) {
  const mmdFile = path.join(diagramsDir, `diagram_${i}.mmd`);
  const code = fs.readFileSync(mmdFile, 'utf8');
  
  // Basic structural syntax checks
  const lines = code.split('\n');
  const typeLine = lines[0].trim();
  
  console.log(`Diagram #${i} (${typeLine}):`);
  
  // Check common mermaid syntax errors
  let subgraphsOpened = 0;
  let subgraphsClosed = 0;
  let syntaxErrors = [];
  
  lines.forEach((line, idx) => {
    const l = line.trim();
    if (l.startsWith('subgraph ')) subgraphsOpened++;
    if (l === 'end') subgraphsClosed++;
    
    // Check for illegal characters or broken labels
    if (l.includes('-->|') && !l.includes('|', l.indexOf('-->|') + 4)) {
      syntaxErrors.push(`Unclosed label pipe at line ${idx + 1}: ${l}`);
    }
    if (l.includes('<-->|') && !l.includes('|', l.indexOf('<-->|') + 5)) {
      syntaxErrors.push(`Unclosed label pipe at line ${idx + 1}: ${l}`);
    }
  });
  
  if (subgraphsOpened !== subgraphsClosed) {
    syntaxErrors.push(`Subgraph mismatch: opened ${subgraphsOpened}, closed ${subgraphsClosed}`);
  }
  
  if (syntaxErrors.length === 0) {
    console.log(`  Structure & syntax check: OK (${lines.length} lines)`);
  } else {
    console.log(`  ERRORS:`);
    syntaxErrors.forEach(err => console.log(`    - ${err}`));
  }
}
