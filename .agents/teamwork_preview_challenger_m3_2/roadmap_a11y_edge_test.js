const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'css', 'styles.css'), 'utf8');
const geminiJs = fs.readFileSync(path.join(rootDir, 'js', 'gemini-scan.js'), 'utf8');
const recipesJs = fs.readFileSync(path.join(rootDir, 'js', 'recipes.js'), 'utf8');
const scannerJs = fs.readFileSync(path.join(rootDir, 'js', 'scanner.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');

let failures = 0;
const pass = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failures += 1; };

function boot(storageSeed = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  const storage = { ...storageSeed };
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
      clear: () => Object.keys(storage).forEach((k) => delete storage[k])
    }
  });
  window.speechSynthesis = { speak() {}, cancel() {} };
  window.SpeechSynthesisUtterance = function () {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {}, clearRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {}, beginPath() {}, arc() {}, stroke() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; }
  });
  window.eval(geminiJs);
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return window;
}

console.log('=== M3 CHALLENGER 2: ROADMAP A11Y + EDGE CASES ===');

// CSS responsive / touch target contracts
if (css.includes('@media (max-width: 600px)') && css.includes('.roadmap-timeline-grid') && css.includes('min-height: 44px')) {
  pass('Mobile roadmap grid + 44px vote touch target present');
} else {
  fail('Missing mobile roadmap responsive / touch-target styles');
}
if (css.includes('prefers-reduced-motion') && css.includes('.roadmap-phase-card')) {
  pass('prefers-reduced-motion handled for roadmap cards');
} else {
  fail('Missing reduced-motion styles for roadmap');
}

const window = boot();
const btn = window.document.getElementById('btn-roadmap');
const modal = window.document.getElementById('modal-roadmap');
const dialog = modal.querySelector('[role="dialog"]');

if (btn.getAttribute('aria-label') && btn.getAttribute('aria-controls') === 'modal-roadmap') {
  pass('Roadmap trigger has aria-label + aria-controls');
} else fail('Roadmap trigger missing aria wiring');

if (dialog && dialog.getAttribute('aria-modal') === 'true' && dialog.getAttribute('aria-labelledby') === 'roadmap-modal-title') {
  pass('Roadmap dialog semantics present');
} else fail('Roadmap dialog semantics missing');

btn.click();
if (dialog.contains(window.document.activeElement)) {
  pass('Focus moves into roadmap dialog on open');
} else fail('Focus not moved into roadmap dialog');

const vote = window.document.querySelector('.btn-vote[data-version-id="v2.0"]');
if (vote.getAttribute('aria-pressed') === 'false') pass('Initial aria-pressed=false on vote button');
else fail('Initial aria-pressed incorrect');

vote.click();
const voted = window.document.querySelector('.btn-vote[data-version-id="v2.0"]');
if (voted.getAttribute('aria-pressed') === 'true' && voted.classList.contains('voted')) {
  pass('Vote sets aria-pressed=true and .voted');
} else fail('Vote did not update aria-pressed/.voted');

// Rapid toggle race
for (let i = 0; i < 10; i++) {
  window.document.querySelector('.btn-vote[data-version-id="v5.0"]').click();
}
const v5 = window.document.querySelector('.btn-vote[data-version-id="v5.0"]');
const votes = JSON.parse(window.localStorage.getItem('leftoverchef_roadmap_votes'));
if (votes['v5.0'] === false && v5.getAttribute('aria-pressed') === 'false') {
  pass('Even rapid toggles keep DOM/localStorage in sync for v5.0');
} else fail(`Rapid toggle sync failed: ${JSON.stringify(votes)}`);

window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
if (modal.classList.contains('hidden') && window.document.activeElement === btn) {
  pass('Escape closes roadmap and restores trigger focus');
} else fail('Escape/focus restore failed for roadmap');

// Empty localStorage reopen
const window2 = boot();
window2.document.getElementById('btn-roadmap').click();
if (window2.document.querySelectorAll('.roadmap-phase-card').length === 4) {
  pass('Empty localStorage still renders 4 phase cards');
} else fail('Empty localStorage render failed');

console.log(failures === 0 ? '\n🎉 ALL ROADMAP A11Y/EDGE TESTS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
