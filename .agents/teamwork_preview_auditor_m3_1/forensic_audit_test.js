const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== STARTING FORENSIC INTEGRITY AUDIT TEST SUITE (M3 ROADMAP UI) ===');

let exitCode = 0;
function logPass(msg) {
  console.log(`✅ [PASS] ${msg}`);
}
function logFail(msg) {
  console.error(`❌ [FAIL] ${msg}`);
  exitCode = 1;
}

const rootDir = path.join(__dirname, '..', '..');

// 1. Inspect index.html
try {
  const htmlPath = path.join(rootDir, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  if (htmlContent.includes('id="btn-roadmap"') && htmlContent.includes('🚀')) {
    logPass('index.html contains #btn-roadmap trigger button with rocket emoji.');
  } else {
    logFail('index.html missing #btn-roadmap button.');
  }

  if (htmlContent.includes('id="modal-roadmap"') && htmlContent.includes('roadmap-cards-container')) {
    logPass('index.html contains #modal-roadmap with #roadmap-cards-container.');
  } else {
    logFail('index.html missing #modal-roadmap or container.');
  }

  if (htmlContent.includes('id="btn-close-roadmap"') && htmlContent.includes('id="btn-close-roadmap-footer"')) {
    logPass('index.html contains top and footer close buttons for roadmap modal.');
  } else {
    logFail('index.html missing close buttons.');
  }
} catch (e) {
  logFail(`Error reading index.html: ${e.message}`);
}

// 2. Inspect css/styles.css
try {
  const cssPath = path.join(rootDir, 'css', 'styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  const requiredClasses = [
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

  let missingCss = [];
  requiredClasses.forEach(cls => {
    if (!cssContent.includes(cls)) {
      missingCss.push(cls);
    }
  });

  if (missingCss.length === 0) {
    logPass('css/styles.css contains all required roadmap layout & design system classes.');
  } else {
    logFail(`css/styles.css missing classes: ${missingCss.join(', ')}`);
  }
} catch (e) {
  logFail(`Error reading css/styles.css: ${e.message}`);
}

// 3. Inspect service-worker.js
try {
  const swPath = path.join(rootDir, 'service-worker.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  if (swContent.includes("CACHE_NAME = 'leftover-chef-v3'") || swContent.includes('CACHE_NAME = "leftover-chef-v3"')) {
    logPass('service-worker.js correctly bumped CACHE_NAME to leftover-chef-v3.');
  } else {
    logFail('service-worker.js CACHE_NAME is not bumped to leftover-chef-v3.');
  }
} catch (e) {
  logFail(`Error reading service-worker.js: ${e.message}`);
}

// 4. JSDOM Behavioral & Interaction Forensic Verification
try {
  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const dom = new JSDOM(htmlContent, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { window } = dom;
  const { document, localStorage } = window;

  // Mock speech synthesis & canvas context for JSDOM
  window.speechSynthesis = { speak: () => {}, cancel: () => {} };
  window.SpeechSynthesisUtterance = function() {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8Array(4) })
  });

  // Load scripts into JSDOM environment
  const recipesJs = fs.readFileSync(path.join(rootDir, 'js', 'recipes.js'), 'utf8');
  const scannerJs = fs.readFileSync(path.join(rootDir, 'js', 'scanner.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');

  window.eval(recipesJs);
  window.eval(scannerJs);

  // Trigger DOMContentLoaded manually after loading app.js
  window.eval(appJs);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const modalRoadmap = document.getElementById('modal-roadmap');
  const btnRoadmap = document.getElementById('btn-roadmap');
  const btnClose = document.getElementById('btn-close-roadmap');
  const btnCloseFooter = document.getElementById('btn-close-roadmap-footer');
  const container = document.getElementById('roadmap-cards-container');

  // Verify Initial State
  if (modalRoadmap.classList.contains('hidden')) {
    logPass('Roadmap modal is initially hidden.');
  } else {
    logFail('Roadmap modal is NOT initially hidden.');
  }

  // Open Modal
  btnRoadmap.click();
  if (!modalRoadmap.classList.contains('hidden')) {
    logPass('#btn-roadmap click opens the roadmap modal.');
  } else {
    logFail('#btn-roadmap click failed to open the modal.');
  }

  // Verify Rendered Cards
  const cards = container.querySelectorAll('.roadmap-phase-card');
  if (cards.length === 4) {
    logPass(`Rendered exactly ${cards.length} roadmap phase cards (v2.0, v3.0, v4.0, v5.0).`);
  } else {
    logFail(`Expected 4 roadmap phase cards, found ${cards.length}.`);
  }

  // Verify Card Content & Baseline Votes
  const expectedVersions = ['v2.0', 'v3.0', 'v4.0', 'v5.0'];
  const expectedBaselines = [142, 98, 76, 115];

  let cardsValid = true;
  cards.forEach((card, idx) => {
    const title = card.querySelector('h3').textContent;
    const voteBtn = card.querySelector('.btn-vote');
    const features = card.querySelectorAll('.roadmap-feature-item');

    if (!title.includes(expectedVersions[idx])) {
      cardsValid = false;
      logFail(`Card ${idx} title does not contain ${expectedVersions[idx]}`);
    }
    if (!voteBtn.textContent.includes(expectedBaselines[idx].toString())) {
      cardsValid = false;
      logFail(`Card ${idx} baseline vote count mismatch: expected ${expectedBaselines[idx]}, got ${voteBtn.textContent}`);
    }
    if (features.length === 0) {
      cardsValid = false;
      logFail(`Card ${idx} features list is empty.`);
    }
  });

  if (cardsValid) {
    logPass('All version titles, baseline vote counts, and feature lists match specs.');
  }

  // Test Vote Toggling (v2.0) — re-query DOM after each renderRoadmap()
  cards[0].querySelector('.btn-vote').click(); // Vote for v2.0
  const votedBtn = container.querySelector('.btn-vote[data-version-id="v2.0"]');

  if (votedBtn && votedBtn.classList.contains('voted') && votedBtn.textContent.includes('143') && votedBtn.textContent.includes('Votado')) {
    logPass('Voting on v2.0 updates button state to voted and increments vote count to 143.');
  } else {
    logFail(`Voting on v2.0 failed. Button text: "${votedBtn ? votedBtn.textContent : 'missing'}", classes: "${votedBtn ? votedBtn.className : 'n/a'}"`);
  }

  // Check LocalStorage Persistence
  const savedVotesJson = localStorage.getItem('leftoverchef_roadmap_votes');
  const savedVotes = savedVotesJson ? JSON.parse(savedVotesJson) : {};
  if (savedVotes['v2.0'] === true) {
    logPass('Vote persistence in localStorage key "leftoverchef_roadmap_votes" verified (v2.0 = true).');
  } else {
    logFail(`LocalStorage persistence failed. Saved votes: ${savedVotesJson}`);
  }

  // Un-vote Test
  container.querySelector('.btn-vote[data-version-id="v2.0"]').click();
  const updatedVotes = JSON.parse(localStorage.getItem('leftoverchef_roadmap_votes'));
  const updatedBtn = container.querySelector('.btn-vote[data-version-id="v2.0"]');

  if (updatedBtn && !updatedBtn.classList.contains('voted') && updatedBtn.textContent.includes('142') && updatedVotes['v2.0'] === false) {
    logPass('Un-voting v2.0 correctly decrements count back to 142 and updates localStorage (v2.0 = false).');
  } else {
    logFail(`Un-voting v2.0 failed. Button text: "${updatedBtn ? updatedBtn.textContent : 'missing'}", localStorage: ${JSON.stringify(updatedVotes)}`);
  }

  // Multi-vote Test (v3.0 and v5.0)
  container.querySelector('.btn-vote[data-version-id="v3.0"]').click();
  container.querySelector('.btn-vote[data-version-id="v5.0"]').click();

  const multiVotes = JSON.parse(localStorage.getItem('leftoverchef_roadmap_votes'));
  if (multiVotes['v3.0'] === true && multiVotes['v5.0'] === true) {
    logPass('Multi-vote tracking (v3.0 and v5.0) persisted accurately in localStorage.');
  } else {
    logFail(`Multi-vote tracking failed: ${JSON.stringify(multiVotes)}`);
  }

  // Accessibility contract for roadmap modal
  const dialog = modalRoadmap.querySelector('[role="dialog"]');
  if (dialog && dialog.getAttribute('aria-modal') === 'true' && dialog.getAttribute('aria-labelledby') === 'roadmap-modal-title') {
    logPass('Roadmap dialog exposes role="dialog", aria-modal, and aria-labelledby.');
  } else {
    logFail('Roadmap dialog missing accessibility attributes.');
  }

  // Test Modal Close Buttons
  btnClose.click();
  if (modalRoadmap.classList.contains('hidden')) {
    logPass('Top close button (#btn-close-roadmap) closes the modal.');
  } else {
    logFail('Top close button failed to close modal.');
  }

  btnRoadmap.click();
  btnCloseFooter.click();
  if (modalRoadmap.classList.contains('hidden')) {
    logPass('Footer close button (#btn-close-roadmap-footer) closes the modal.');
  } else {
    logFail('Footer close button failed to close modal.');
  }

  btnRoadmap.click();
  modalRoadmap.click(); // Backdrop click
  if (modalRoadmap.classList.contains('hidden')) {
    logPass('Backdrop click on #modal-roadmap closes the modal.');
  } else {
    logFail('Backdrop click failed to close modal.');
  }

} catch (e) {
  logFail(`JSDOM interaction error: ${e.stack || e.message}`);
}

console.log('\n=== AUDIT TEST RESULTS SUMMARY ===');
if (exitCode === 0) {
  console.log('🎉 ALL FORENSIC AUDIT TESTS PASSED WITH ZERO VIOLATIONS.');
} else {
  console.log('❌ FORENSIC AUDIT TESTS DETECTED VIOLATIONS.');
}

process.exit(exitCode);
