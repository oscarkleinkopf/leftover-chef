const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const recipesJs = fs.readFileSync(path.join(rootDir, 'js', 'recipes.js'), 'utf8');
const scannerJs = fs.readFileSync(path.join(rootDir, 'js', 'scanner.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');

let failures = 0;
function pass(msg) { console.log(`✅ ${msg}`); }
function fail(msg) { console.error(`❌ ${msg}`); failures += 1; }

function boot(initialStorage = {}) {
  const dom = new JSDOM(htmlContent, { url: 'http://localhost/', runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  const storage = { ...initialStorage };
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
    }
  });
  window.speechSynthesis = { speak() {}, cancel() {} };
  window.SpeechSynthesisUtterance = function () {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {}, clearRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {}, beginPath() {}, arc() {}, stroke() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; }
  });
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, storage };
}

console.log('=== M3 CHALLENGER 1: ROADMAP STRESS SUITE ===');

// 1. Server syntax + static file presence
try {
  require('child_process').execSync('node --check js/app.js', { cwd: rootDir, stdio: 'pipe' });
  pass('node --check js/app.js succeeded');
} catch (e) {
  fail(`node --check failed: ${e.message}`);
}

// 2. Corrupted roadmap votes JSON
{
  const { window } = boot({ leftoverchef_roadmap_votes: '{not-json' });
  const modal = window.document.getElementById('modal-roadmap');
  window.document.getElementById('btn-roadmap').click();
  if (!modal.classList.contains('hidden') && window.document.querySelectorAll('.roadmap-phase-card').length === 4) {
    pass('Corrupted leftoverchef_roadmap_votes does not crash modal open');
  } else {
    fail('Corrupted roadmap votes broke modal open/render');
  }
}

// 3. Non-object roadmap votes payload
{
  const { window } = boot({ leftoverchef_roadmap_votes: '"oops"' });
  window.document.getElementById('btn-roadmap').click();
  const cards = window.document.querySelectorAll('.roadmap-phase-card');
  if (cards.length === 4) pass('Non-object roadmap votes payload falls back safely');
  else fail('Non-object roadmap votes payload broke render');
}

// 4. Rapid vote toggles
{
  const { window, storage } = boot();
  window.document.getElementById('btn-roadmap').click();
  for (let i = 0; i < 25; i++) {
    window.document.querySelector('.btn-vote[data-version-id="v2.0"]').click();
  }
  const votes = JSON.parse(storage.leftoverchef_roadmap_votes);
  const btn = window.document.querySelector('.btn-vote[data-version-id="v2.0"]');
  if (votes['v2.0'] === true && btn.classList.contains('voted') && btn.getAttribute('aria-pressed') === 'true') {
    pass('25 rapid toggles leave v2.0 voted with aria-pressed=true');
  } else {
    fail(`Rapid toggle final state unexpected: ${JSON.stringify(votes)} / ${btn && btn.className}`);
  }
}

// 5. Escape closes roadmap + restores focus
{
  const { window } = boot();
  const btn = window.document.getElementById('btn-roadmap');
  const modal = window.document.getElementById('modal-roadmap');
  btn.click();
  if (modal.classList.contains('hidden')) fail('Roadmap modal did not open');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (modal.classList.contains('hidden') && window.document.activeElement === btn) {
    pass('Escape closes roadmap modal and restores focus to trigger');
  } else {
    fail('Escape close / focus restore failed');
  }
}

// 6. Multi-version persistence across reopen
{
  const { window, storage } = boot();
  window.document.getElementById('btn-roadmap').click();
  window.document.querySelector('.btn-vote[data-version-id="v3.0"]').click();
  window.document.querySelector('.btn-vote[data-version-id="v4.0"]').click();
  window.document.getElementById('btn-close-roadmap').click();
  window.document.getElementById('btn-roadmap').click();
  const persisted = JSON.parse(storage.leftoverchef_roadmap_votes);
  const v3 = window.document.querySelector('.btn-vote[data-version-id="v3.0"]');
  const v4 = window.document.querySelector('.btn-vote[data-version-id="v4.0"]');
  if (persisted['v3.0'] && persisted['v4.0'] && v3.classList.contains('voted') && v4.classList.contains('voted')) {
    pass('Votes persist across modal close/reopen');
  } else {
    fail(`Persistence across reopen failed: ${JSON.stringify(persisted)}`);
  }
}

console.log(failures === 0 ? '\n🎉 ALL ROADMAP STRESS TESTS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
