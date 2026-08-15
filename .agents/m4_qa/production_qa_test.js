/**
 * Milestone 4 — Production QA Suite (R3)
 * Verifies ROADMAP.md, roadmap UI contracts, zero boot console errors,
 * PWA service-worker/manifest integrity, asset reachability, and GitHub Pages readiness.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { JSDOM } = require('jsdom');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
let failures = 0;
const pass = (msg) => console.log(`✅ ${msg}`);
const fail = (msg) => { console.error(`❌ ${msg}`); failures += 1; };

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

console.log('=== M4 PRODUCTION QA SUITE ===\n');

// --------------------------------------------------------------------------
// 1) Acceptance: ROADMAP.md (R1 residual)
// --------------------------------------------------------------------------
{
  if (!fileExists('ROADMAP.md')) {
    fail('ROADMAP.md missing at project root');
  } else {
    const md = read('ROADMAP.md');
    const phases = ['Phase 2.0', 'Phase 3.0', 'Phase 4.0', 'Phase 5.0'];
    const missing = phases.filter((p) => !md.includes(p));
    const mermaidCount = (md.match(/```mermaid/g) || []).length;
    if (missing.length === 0 && mermaidCount >= 1) {
      pass(`ROADMAP.md present with 4 phases and ${mermaidCount} Mermaid diagram(s)`);
    } else {
      fail(`ROADMAP.md incomplete (missing=${missing.join(',') || 'none'}, mermaid=${mermaidCount})`);
    }
  }
}

// --------------------------------------------------------------------------
// 2) Syntax checks
// --------------------------------------------------------------------------
{
  const files = ['js/app.js', 'js/recipes.js', 'js/scanner.js', 'service-worker.js', 'server.js', 'start.js'];
  let syntaxOk = true;
  for (const f of files) {
    try {
      require('child_process').execSync(`node --check ${f}`, { cwd: rootDir, stdio: 'pipe' });
    } catch (e) {
      syntaxOk = false;
      fail(`Syntax error in ${f}`);
    }
  }
  if (syntaxOk) pass(`Syntax OK for ${files.length} JS entrypoints`);
}

// --------------------------------------------------------------------------
// 3) PWA contracts
// --------------------------------------------------------------------------
{
  const sw = read('service-worker.js');
  const manifest = JSON.parse(read('manifest.json'));
  const html = read('index.html');
  const app = read('js/app.js');

  if (sw.includes("CACHE_NAME = 'leftover-chef-v6'")) pass('Service worker cache is leftover-chef-v6');
  else fail('Service worker CACHE_NAME is not leftover-chef-v6');

  const requiredAssets = [
    './', './index.html', './css/styles.css', './js/recipes.js', './js/scanner.js',
    './js/app.js', './icon.svg', './manifest.json'
  ];
  const missingAssets = requiredAssets.filter((a) => !sw.includes(`'${a}'`));
  if (missingAssets.length === 0) pass('Service worker precaches core app shell assets');
  else fail(`SW missing precache assets: ${missingAssets.join(', ')}`);

  if (sw.includes("event.request.mode === 'navigate'") && sw.includes('accept')) {
    pass('SW offline fallback guards null Accept headers / navigations');
  } else {
    fail('SW offline fallback missing null-safe Accept / navigate handling');
  }

  if (manifest.name && manifest.short_name && manifest.start_url && manifest.icons?.length) {
    pass('manifest.json has required installability fields');
  } else {
    fail('manifest.json missing required fields');
  }

  if (html.includes('rel="manifest"') && app.includes("serviceWorker.register('./service-worker.js')")) {
    pass('HTML manifest link + app.js service worker registration present');
  } else {
    fail('PWA registration wiring incomplete');
  }

  if (fileExists('.nojekyll')) pass('.nojekyll present for GitHub Pages');
  else fail('.nojekyll missing (Jekyll may ignore dotted folders/assets)');
}

// --------------------------------------------------------------------------
// 4) Zero console errors on boot + roadmap UI smoke
// --------------------------------------------------------------------------
{
  const html = read('index.html');
  const recipesJs = read('js/recipes.js');
  const scannerJs = read('js/scanner.js');
  const appJs = read('js/app.js');

  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => { errors.push(args.map(String).join(' ')); };

  window.speechSynthesis = { speak() {}, cancel() {} };
  window.SpeechSynthesisUtterance = function () {};
  window.AudioContext = function () {
    return {
      createOscillator() {
        return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
      },
      createGain() { return { gain: { value: 0 }, connect() {} }; },
      destination: {},
      close() { return Promise.resolve(); }
    };
  };
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {}, clearRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {}, beginPath() {}, arc() {}, stroke() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; }
  });

  // Seed corrupt persistence to ensure boot resilience
  window.localStorage.setItem('leftover_chef_settings', '{bad');
  window.localStorage.setItem('leftover_chef_bookmarks', '123');
  window.localStorage.setItem('leftoverchef_roadmap_votes', '"nope"');

  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  window.dispatchEvent(new window.Event('load'));

  const btn = window.document.getElementById('btn-roadmap');
  const modal = window.document.getElementById('modal-roadmap');
  btn.click();
  const cards = window.document.querySelectorAll('.roadmap-phase-card');
  window.document.querySelector('.btn-vote[data-version-id="v2.0"]').click();
  const votes = JSON.parse(window.localStorage.getItem('leftoverchef_roadmap_votes'));

  console.error = originalError;

  if (errors.length === 0) pass('Boot completed with zero console.error calls (including corrupt storage)');
  else fail(`Boot produced console.error: ${errors.join(' | ')}`);

  if (!modal.classList.contains('hidden') && cards.length === 4 && votes['v2.0'] === true) {
    pass('Roadmap UI opens, renders 4 cards, and persists a vote');
  } else {
    fail('Roadmap UI smoke checks failed');
  }
}

// --------------------------------------------------------------------------
// 5) Relative paths for GitHub Pages
// --------------------------------------------------------------------------
{
  const html = read('index.html');
  const absRootRefs = html.match(/(?:href|src)="\/(?!\/)[^"]+"/g) || [];
  if (absRootRefs.length === 0) pass('index.html uses relative asset paths (GitHub Pages safe)');
  else fail(`Absolute root paths found (break project Pages): ${absRootRefs.join(', ')}`);
}

// --------------------------------------------------------------------------
// 6) HTTP smoke against local server
// --------------------------------------------------------------------------
async function httpSmoke() {
  const port = 3457;
  const serverPath = path.join(rootDir, 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 5000);
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('localhost')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('error', reject);
  });

  const paths = [
    '/', '/index.html', '/css/styles.css', '/js/app.js', '/js/recipes.js',
    '/js/scanner.js', '/service-worker.js', '/manifest.json', '/icon.svg', '/ROADMAP.md'
  ];

  for (const p of paths) {
    const status = await new Promise((resolve) => {
      http.get({ hostname: '127.0.0.1', port, path: p }, (res) => {
        res.resume();
        resolve(res.statusCode);
      }).on('error', () => resolve(0));
    });
    if (status === 200) pass(`HTTP 200 ${p}`);
    else fail(`HTTP ${status || 'ERR'} ${p}`);
  }

  child.kill('SIGTERM');
}

httpSmoke()
  .catch((e) => fail(`HTTP smoke failed: ${e.message}`))
  .finally(() => {
    console.log('\n=== M4 QA SUMMARY ===');
    if (failures === 0) {
      console.log('🎉 ALL M4 PRODUCTION QA CHECKS PASSED');
      process.exit(0);
    }
    console.log(`❌ ${failures} FAILURE(S)`);
    process.exit(1);
  });
