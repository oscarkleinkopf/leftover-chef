const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log("=== RUNNING ROADMAP VERIFICATION SUITE ===");

const projectRoot = path.join(__dirname, '..', '..');
const htmlContent = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const jsAppContent = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
const cssContent = fs.readFileSync(path.join(projectRoot, 'css/styles.css'), 'utf8');
const swContent = fs.readFileSync(path.join(projectRoot, 'service-worker.js'), 'utf8');

// 1. Verify HTML elements
console.log("1. Checking index.html elements...");
if (!htmlContent.includes('id="btn-roadmap"')) {
  throw new Error("Missing #btn-roadmap in index.html!");
}
if (!htmlContent.includes('title="Roadmap de Mejoras"')) {
  throw new Error("Missing title attribute in #btn-roadmap!");
}
if (!htmlContent.includes('id="modal-roadmap"')) {
  throw new Error("Missing #modal-roadmap overlay in index.html!");
}
if (!htmlContent.includes('id="btn-close-roadmap"')) {
  throw new Error("Missing #btn-close-roadmap in index.html!");
}
if (!htmlContent.includes('id="btn-close-roadmap-footer"')) {
  throw new Error("Missing #btn-close-roadmap-footer in index.html!");
}
if (!htmlContent.includes('id="roadmap-cards-container"')) {
  throw new Error("Missing #roadmap-cards-container in index.html!");
}
if (!htmlContent.includes('🗺️ Roadmap Estratégico - Próximas Versiones')) {
  throw new Error("Missing expected modal header text in index.html!");
}
console.log("   ✅ index.html checks passed.");

// 2. Verify CSS classes
console.log("2. Checking css/styles.css rules...");
const requiredCssSelectors = [
  '.roadmap-timeline-grid',
  '.roadmap-phase-card',
  '.roadmap-card-header',
  '.roadmap-status-badge',
  '.status-in-progress',
  '.status-planned',
  '.status-evaluating',
  '.roadmap-feature-list',
  '.roadmap-feature-item',
  '.btn-vote',
  '.btn-vote.voted'
];

requiredCssSelectors.forEach(selector => {
  if (!cssContent.includes(selector)) {
    throw new Error(`Missing CSS selector: ${selector} in styles.css`);
  }
});
console.log("   ✅ css/styles.css checks passed.");

// 3. Verify service-worker.js cache bump
console.log("3. Checking service-worker.js CACHE_NAME...");
if (!swContent.includes("const CACHE_NAME = 'leftover-chef-v7';")) {
  throw new Error("service-worker.js CACHE_NAME is not set to 'leftover-chef-v7'!");
}
console.log("   ✅ service-worker.js checks passed.");

// 4. Verify JSDOM Execution & Interactions
console.log("4. Executing DOM & app.js in JSDOM environment...");

const dom = new JSDOM(htmlContent, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

const window = dom.window;
const document = window.document;

// Mock window globals expected by app.js
window.CATEGORIES = {};
window.INGREDIENT_DATABASE = [];
window.speechSynthesis = { speak: () => {}, cancel: () => {} };

// Evaluate recipes.js and scanner.js mock if needed, then app.js
const recipesContent = fs.readFileSync(path.join(projectRoot, 'js/recipes.js'), 'utf8');
const geminiContent = fs.readFileSync(path.join(projectRoot, 'js/gemini-scan.js'), 'utf8');
const scannerContent = fs.readFileSync(path.join(projectRoot, 'js/scanner.js'), 'utf8');

window.eval(geminiContent);
window.eval(recipesContent);
window.eval(scannerContent);

// Listen for DOMContentLoaded after evaluating app.js
const event = new window.Event('DOMContentLoaded');
window.eval(jsAppContent);
document.dispatchEvent(event);

// Check elements in JSDOM
const btnRoadmap = document.getElementById('btn-roadmap');
const modalRoadmap = document.getElementById('modal-roadmap');
const btnCloseHeader = document.getElementById('btn-close-roadmap');
const btnCloseFooter = document.getElementById('btn-close-roadmap-footer');
const container = document.getElementById('roadmap-cards-container');

if (!btnRoadmap || !modalRoadmap || !container) {
  throw new Error("JSDOM element lookup failed for Roadmap components");
}

// Check initial hidden state
if (!modalRoadmap.classList.contains('hidden')) {
  throw new Error("Modal roadmap should be initially hidden");
}

// Simulate click on btnRoadmap to open modal
btnRoadmap.click();

if (modalRoadmap.classList.contains('hidden')) {
  throw new Error("Modal roadmap failed to open after clicking #btn-roadmap!");
}

// Verify rendered cards
const cards = container.querySelectorAll('.roadmap-phase-card');
console.log(`   Rendered ${cards.length} roadmap cards.`);
if (cards.length !== 4) {
  throw new Error(`Expected 4 roadmap cards, got ${cards.length}`);
}

// Test voting on first card (v2.0)
const firstVoteBtn = cards[0].querySelector('.btn-vote');
console.log("   First card vote button initial text:", firstVoteBtn.textContent.trim());

// Click vote button
firstVoteBtn.click();

// Check localStorage
const storedVotes = JSON.parse(window.localStorage.getItem('leftoverchef_roadmap_votes'));
console.log("   localStorage leftoverchef_roadmap_votes:", storedVotes);
if (!storedVotes || !storedVotes['v2.0']) {
  throw new Error("Vote state was not saved to localStorage leftoverchef_roadmap_votes!");
}

// Check voted class and updated count
const updatedCards = container.querySelectorAll('.roadmap-phase-card');
const updatedVoteBtn = updatedCards[0].querySelector('.btn-vote');
if (!updatedVoteBtn.classList.contains('voted')) {
  throw new Error("Vote button missing '.voted' class after clicking!");
}
console.log("   First card vote button after click text:", updatedVoteBtn.textContent.trim());

// Click close header
btnCloseHeader.click();
if (!modalRoadmap.classList.contains('hidden')) {
  throw new Error("Modal failed to close via header close button!");
}

// Re-open and close footer
btnRoadmap.click();
if (modalRoadmap.classList.contains('hidden')) {
  throw new Error("Modal failed to re-open!");
}
btnCloseFooter.click();
if (!modalRoadmap.classList.contains('hidden')) {
  throw new Error("Modal failed to close via footer close button!");
}

console.log("   ✅ JSDOM interaction tests completed successfully.");
console.log("=== ALL ROADMAP VERIFICATION CHECKS PASSED ===");
