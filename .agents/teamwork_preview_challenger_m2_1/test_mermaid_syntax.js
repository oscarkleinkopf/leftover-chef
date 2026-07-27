const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.Element = dom.window.Element;
global.SVGElement = dom.window.SVGElement;

async function testAll() {
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true });

    const diagramsDir = path.join(__dirname, 'diagrams');
    const files = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.mmd')).sort((a,b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

    console.log(`--- MERMAID SYNTAX VERIFICATION (${files.length} DIAGRAMS) ---`);
    let passCount = 0;
    let failCount = 0;
    let results = [];

    for (const file of files) {
      const filePath = path.join(diagramsDir, file);
      const code = fs.readFileSync(filePath, 'utf8');
      try {
        const parseResult = await mermaid.parse(code);
        console.log(`[PASS] ${file}: Valid Mermaid syntax.`);
        passCount++;
        results.push({ file, valid: true });
      } catch (err) {
        console.log(`[FAIL] ${file}: Syntax Error! ${err.message || err}`);
        failCount++;
        results.push({ file, valid: false, error: err.message || String(err) });
      }
    }

    console.log(`\nSummary: ${passCount} passed, ${failCount} failed.`);
    fs.writeFileSync(path.join(__dirname, 'mermaid_results.json'), JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Fatal runner error:', err);
  }
}

testAll();
