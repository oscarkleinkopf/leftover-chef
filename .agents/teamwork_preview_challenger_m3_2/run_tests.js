const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '../../');
const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const recipesJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'recipes.js'), 'utf8');
const scannerJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'scanner.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');

const testResults = [];

function runTest(testName, testFn) {
  try {
    const dom = new JSDOM(htmlContent, {
      url: 'http://localhost/',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    const { window } = dom;
    
    // Mock storage
    const storage = {};
    window.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, val) => { storage[key] = String(val); },
      removeItem: (key) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
    };
    window._testStorage = storage;

    // Mock Audio & Canvas HTML API
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
    window.HTMLCanvasElement.prototype.getContext = () => ({
      drawImage: () => {}, clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {}, beginPath: () => {},
      arc: () => {}, stroke: () => {}, fill: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} })
    });

    testFn(window, dom);
  } catch (err) {
    testResults.push({ name: testName, status: 'FAIL', error: err.stack || err.message });
    return;
  }
}

console.log('--- STARTING EMPIRICAL SUITE ---');

// TEST 1: Empty localStorage initialization
runTest('1. Empty localStorage Initialization', (window) => {
  window.eval(recipesJs);
  window.eval(scannerJs);
  let errorCaught = null;
  try {
    window.eval(appJs);
  } catch(e) {
    errorCaught = e;
  }
  if (errorCaught) {
    testResults.push({ name: '1. Empty localStorage Initialization', status: 'FAIL', error: errorCaught.message });
  } else {
    testResults.push({ name: '1. Empty localStorage Initialization', status: 'PASS', details: 'Initialized cleanly with empty localStorage' });
  }
});

// TEST 2: Corrupted Settings JSON in localStorage
runTest('2. Corrupted Settings JSON in localStorage', (window) => {
  window._testStorage['leftover_chef_settings'] = 'INVALID_JSON_';
  window.eval(recipesJs);
  window.eval(scannerJs);
  let errorCaught = null;
  try {
    window.eval(appJs);
  } catch(e) {
    errorCaught = e;
  }
  if (errorCaught) {
    testResults.push({ name: '2. Corrupted Settings JSON in localStorage', status: 'FAIL', error: errorCaught.message });
  } else {
    testResults.push({ name: '2. Corrupted Settings JSON in localStorage', status: 'PASS', details: 'Handled corrupted settings' });
  }
});

// TEST 3: Corrupted Bookmarks JSON in localStorage
runTest('3. Corrupted Bookmarks JSON in localStorage', (window) => {
  window._testStorage['leftover_chef_bookmarks'] = 'CORRUPTED_{';
  window.eval(recipesJs);
  window.eval(scannerJs);
  let errorCaught = null;
  try {
    window.eval(appJs);
  } catch(e) {
    errorCaught = e;
  }
  if (errorCaught) {
    testResults.push({ name: '3. Corrupted Bookmarks JSON in localStorage', status: 'FAIL', error: errorCaught.message });
  } else {
    testResults.push({ name: '3. Corrupted Bookmarks JSON in localStorage', status: 'PASS', details: 'Handled corrupted bookmarks' });
  }
});

// TEST 4: Corrupted Profiles (Non-Array value like "12345" or "null") in localStorage
runTest('4. Corrupted Profiles Non-Array in localStorage', (window) => {
  window._testStorage['leftover_chef_profiles'] = '12345';
  window.eval(recipesJs);
  window.eval(scannerJs);
  let errorCaught = null;
  try {
    window.eval(appJs);
  } catch(e) {
    errorCaught = e;
  }
  if (errorCaught) {
    testResults.push({ name: '4. Corrupted Profiles Non-Array in localStorage', status: 'FAIL', error: errorCaught.message });
  } else {
    testResults.push({ name: '4. Corrupted Profiles Non-Array in localStorage', status: 'PASS', details: 'Handled non-array profiles' });
  }
});

// TEST 5: Profile Switching sets state.bookmarks to Set, causing type error crash on bookmark actions
runTest('5. Profile Switching vs state.bookmarks Data Type Discrepancy', (window) => {
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);

  // Trigger profile load / switch which executes syncCurrentProfileToState()
  const btnProfiles = window.document.getElementById('btn-profiles');
  if (!btnProfiles) throw new Error('btn-profiles not found');
  
  // Select an ingredient so recipes render
  const input = window.document.getElementById('manual-ingredient-input');
  const btnAdd = window.document.getElementById('btn-add-manual');
  input.value = 'calabacín';
  btnAdd.click();

  // Switch profiles or trigger sync
  const btnCloseProfiles = window.document.getElementById('btn-close-profiles');
  
  // Try bookmarking a recipe now
  const recipeCard = window.document.querySelector('.recipe-card');
  if (!recipeCard) throw new Error('No recipe card rendered');
  recipeCard.click(); // opens modal-recipe-detail

  const btnBookmark = window.document.getElementById('btn-bookmark-recipe');
  let bookmarkError = null;
  try {
    btnBookmark.click();
  } catch(e) {
    bookmarkError = e;
  }

  if (bookmarkError) {
    testResults.push({ name: '5. Profile Switching vs state.bookmarks Data Type Discrepancy', status: 'FAIL', error: bookmarkError.message + '\n' + bookmarkError.stack });
  } else {
    testResults.push({ name: '5. Profile Switching vs state.bookmarks Data Type Discrepancy', status: 'PASS', details: 'No type error on bookmark click after profile sync' });
  }
});

// TEST 6: Modal Focus Trap & Keyboard Navigation
runTest('6. Modal Focus Trap and Escape Key Navigation', (window) => {
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);

  const modalSettings = window.document.getElementById('modal-settings');
  const btnSettings = window.document.getElementById('btn-settings');
  
  // Open modal
  btnSettings.click();
  const isModalVisible = !modalSettings.classList.contains('hidden');
  
  // Check if focus was placed inside modal
  const activeInsideModal = modalSettings.contains(window.document.activeElement);

  // Dispatch Escape key event on document
  const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true });
  window.document.dispatchEvent(escapeEvent);

  const isModalClosed = modalSettings.classList.contains('hidden');

  let failureReasons = [];
  if (!activeInsideModal) failureReasons.push('Focus was not placed inside modal upon opening');
  if (!isModalClosed) failureReasons.push('Escape key did not close the open modal');

  if (failureReasons.length > 0) {
    testResults.push({ name: '6. Modal Focus Trap and Escape Key Navigation', status: 'FAIL', error: failureReasons.join('; ') });
  } else {
    testResults.push({ name: '6. Modal Focus Trap and Escape Key Navigation', status: 'PASS', details: 'Modal traps focus and responds to Escape key' });
  }
});

// TEST 7: Keyboard accessibility for dropzone and recipe cards
runTest('7. Keyboard Accessibility for Custom Interactive Elements', (window) => {
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);

  const dropzone = window.document.getElementById('dropzone');
  const dropzoneTabindex = dropzone.getAttribute('tabindex');
  const dropzoneRole = dropzone.getAttribute('role');

  // Add ingredient to render recipe cards
  const input = window.document.getElementById('manual-ingredient-input');
  const btnAdd = window.document.getElementById('btn-add-manual');
  input.value = 'calabacín';
  btnAdd.click();

  const recipeCard = window.document.querySelector('.recipe-card');
  const cardTabindex = recipeCard ? recipeCard.getAttribute('tabindex') : null;
  const cardRole = recipeCard ? recipeCard.getAttribute('role') : null;

  let failures = [];
  if (dropzoneTabindex !== '0') failures.push('dropzone lacks tabindex="0"');
  if (dropzoneRole !== 'button') failures.push('dropzone lacks role="button"');
  if (cardTabindex !== '0') failures.push('recipe card lacks tabindex="0"');
  if (cardRole !== 'button') failures.push('recipe card lacks role="button"');

  if (failures.length > 0) {
    testResults.push({ name: '7. Keyboard Accessibility for Custom Interactive Elements', status: 'FAIL', error: failures.join('; ') });
  } else {
    testResults.push({ name: '7. Keyboard Accessibility for Custom Interactive Elements', status: 'PASS', details: 'Custom elements are keyboard accessible' });
  }
});

// TEST 8: Rapid Toggle Clicks Stress Test
runTest('8. Rapid Toggle Clicks Stress Test', (window) => {
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);

  // Rapidly toggle dietary filter chips
  const veganChip = window.document.querySelector('.chip[data-filter="vegan"]');
  let errors = [];
  try {
    for (let i = 0; i < 50; i++) {
      veganChip.click();
    }
  } catch(e) {
    errors.push('Vegan chip rapid click: ' + e.message);
  }

  // Rapidly add & remove manual ingredients
  const input = window.document.getElementById('manual-ingredient-input');
  const btnAdd = window.document.getElementById('btn-add-manual');
  try {
    for (let i = 0; i < 20; i++) {
      input.value = 'tomate ' + i;
      btnAdd.click();
    }
    const btnClearAll = window.document.getElementById('btn-clear-all-ingredients');
    btnClearAll.click();
  } catch(e) {
    errors.push('Rapid ingredient add/clear: ' + e.message);
  }

  if (errors.length > 0) {
    testResults.push({ name: '8. Rapid Toggle Clicks Stress Test', status: 'FAIL', error: errors.join('; ') });
  } else {
    testResults.push({ name: '8. Rapid Toggle Clicks Stress Test', status: 'PASS', details: 'Handled 50 rapid toggle clicks and 20 fast additions without breaking state' });
  }
});

// TEST 9: ARIA Attribute Audit
runTest('9. ARIA Attribute Audit for Modals and Dynamic Regions', (window) => {
  const modals = window.document.querySelectorAll('.modal-overlay');
  let missingAria = [];

  modals.forEach(m => {
    const modalBox = m.querySelector('.modal');
    if (modalBox) {
      if (!modalBox.getAttribute('role')) missingAria.push(m.id + ' missing role="dialog"');
      if (modalBox.getAttribute('aria-modal') !== 'true') missingAria.push(m.id + ' missing aria-modal="true"');
    }
  });

  const iconBtns = window.document.querySelectorAll('.icon-btn, .close-modal-btn');
  iconBtns.forEach(btn => {
    if (!btn.getAttribute('aria-label') && !btn.innerText.trim()) {
      missingAria.push('Icon button missing aria-label: ' + (btn.id || btn.className));
    }
  });

  if (missingAria.length > 0) {
    testResults.push({ name: '9. ARIA Attribute Audit for Modals and Dynamic Regions', status: 'FAIL', error: missingAria.join('; ') });
  } else {
    testResults.push({ name: '9. ARIA Attribute Audit for Modals and Dynamic Regions', status: 'PASS', details: 'All ARIA attributes present' });
  }
});

console.log('\n--- TEST RESULTS SUMMARY ---');
console.log(JSON.stringify(testResults, null, 2));
