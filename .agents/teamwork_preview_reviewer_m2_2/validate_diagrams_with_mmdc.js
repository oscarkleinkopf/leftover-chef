const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const diagramsDir = path.join('.agents', 'teamwork_preview_reviewer_m2_2', 'diagrams');
const puppeteerCfg = path.join('.agents', 'teamwork_preview_reviewer_m2_2', 'puppeteer-config.json');
const results = [];

for (let i = 1; i <= 9; i++) {
  const mmdFile = path.join(diagramsDir, `diagram_${i}.mmd`);
  const svgFile = path.join(diagramsDir, `diagram_${i}.svg`);
  
  console.log(`Testing Diagram #${i}...`);
  try {
    const cmd = `cmd /c "npx -p @mermaid-js/mermaid-cli mmdc -p ${puppeteerCfg} -i ${mmdFile} -o ${svgFile}"`;
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    console.log(`Diagram #${i}: SUCCESS`);
    results.push({ diagram: i, status: 'PASS', output: stdout.trim() });
  } catch (err) {
    console.error(`Diagram #${i}: FAILED`);
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    console.error(stderr);
    results.push({ diagram: i, status: 'FAIL', error: stderr.trim() });
  }
}

fs.writeFileSync(
  path.join('.agents', 'teamwork_preview_reviewer_m2_2', 'mermaid_validation.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);
console.log('\nMermaid validation complete. Results saved to mermaid_validation.json');
