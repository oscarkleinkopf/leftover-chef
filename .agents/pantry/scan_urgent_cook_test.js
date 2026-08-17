/**
 * Scan → pantry expiry → urgent recipe.
 * Covers ID/date normalization, pantry merge, ranking, and the JSDOM cook-now flow.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');
const recipesJs = fs.readFileSync(path.join(rootDir, 'js', 'recipes.js'), 'utf8');
const geminiJs = fs.readFileSync(path.join(rootDir, 'js', 'gemini-scan.js'), 'utf8');
const scannerJs = fs.readFileSync(path.join(rootDir, 'js', 'scanner.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

let failures = 0;
const pass = (msg) => console.log(`✅ ${msg}`);
const fail = (msg) => { console.error(`❌ ${msg}`); failures += 1; };

function loadRecipesApi() {
  const ctx = { window: {}, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(recipesJs, ctx);
  return ctx;
}

function isoDateOffset(days, from = new Date('2026-08-15T12:00:00Z')) {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function bootApp(storageSeed = {}) {
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
  window.eval(recipesJs);
  window.eval(geminiJs);
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, storage };
}

console.log('=== SCAN → URGENT COOK SUITE ===\n');

const api = loadRecipesApi();
const now = new Date('2026-08-15T12:00:00Z');

{
  const prompt = require(path.join(rootDir, 'js', 'gemini-scan.js')).buildGeminiScanPrompt([], 'TM6');
  if (prompt.includes('detectedPantry') && prompt.includes('caduc')) {
    pass('Gemini prompt asks for detectedPantry / expiry dates');
  } else {
    fail('Gemini prompt missing detectedPantry/caducidad instructions');
  }
}

{
  if (
    api.resolveIngredientId('Calabacín') === 'calabacin' &&
    api.resolveIngredientId('POLLO') === 'pollo' &&
    api.resolveIngredientId('zucchini') === 'calabacin' &&
    api.resolveIngredientId('champiñon') === 'champiñon' &&
    api.resolveIngredientId('no-existe-xyz') === null
  ) {
    pass('resolveIngredientId maps accents, aliases, and catalog ids');
  } else {
    fail(`resolveIngredientId unexpected: calabacin=${api.resolveIngredientId('Calabacín')} pollo=${api.resolveIngredientId('POLLO')}`);
  }
}

{
  const iso = api.normalizeIsoDate('17/08/2026', now);
  const already = api.normalizeIsoDate('2026-08-16', now);
  if (iso === '2026-08-17' && already === '2026-08-16' && api.normalizeIsoDate('nope', now) === null) {
    pass('normalizeIsoDate accepts YYYY-MM-DD and DD/MM/YYYY');
  } else {
    fail(`normalizeIsoDate unexpected: iso=${iso} already=${already}`);
  }
}

{
  const detected = api.normalizeDetectedPantry({
    detectedIngredients: ['Calabacín', 'cebolla', 'rúcula misteriosa'],
    detectedPantry: [{ id: 'pollo', grams: 400, expiresAt: '16/08/2026' }]
  }, now);
  const cala = detected.items.find((i) => i.id === 'calabacin');
  const pollo = detected.items.find((i) => i.id === 'pollo');
  if (cala && pollo && pollo.grams === 400 && pollo.expiresAt === '2026-08-16' && detected.unknown.some((n) => /rúcula/i.test(n))) {
    pass('normalizeDetectedPantry merges ids, grams, dates, and unknown names');
  } else {
    fail(`normalizeDetectedPantry unexpected: ${JSON.stringify(detected)}`);
  }
}

{
  const pantry = {
    calabacin: { id: 'calabacin', grams: 200, addedAt: '2026-08-01T00:00:00Z', expiresAt: '2026-08-20' }
  };
  const merged = api.mergeScanIntoPantry(pantry, [
    { id: 'calabacin', expiresAt: '2026-08-16' },
    { id: 'zanahoria' }
  ], now);
  if (merged.calabacin.expiresAt === '2026-08-16' && merged.calabacin.grams === 200 && merged.zanahoria && merged.zanahoria.expiresAt) {
    pass('mergeScanIntoPantry keeps sooner expiry and default-dates new items');
  } else {
    fail(`mergeScanIntoPantry unexpected: ${JSON.stringify(merged)}`);
  }
}

{
  const pantry = {
    calabacin: { id: 'calabacin', expiresAt: isoDateOffset(0, now) },
    zanahoria: { id: 'zanahoria', expiresAt: isoDateOffset(20, now) },
    cebolla: { id: 'cebolla', expiresAt: isoDateOffset(20, now) },
    aceite: { id: 'aceite', expiresAt: isoDateOffset(200, now) },
    sal: { id: 'sal', expiresAt: isoDateOffset(200, now) }
  };
  const available = Object.keys(pantry);
  const picked = api.pickUrgentRecipe(available, pantry, [], [], now);
  const usesCala = picked && picked.recipe.requiredIngredients.some((i) => i.id === 'calabacin');
  if (picked && usesCala && picked.match.urgencyBoost > 0) {
    pass(`pickUrgentRecipe opens a calabacín recipe first (${picked.recipe.id})`);
  } else {
    fail(`pickUrgentRecipe unexpected: ${picked && picked.recipe && picked.recipe.id}`);
  }
}

{
  const htmlSrc = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const appSrc = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
  if (htmlSrc.includes('id="scan-recommend-note"') && appSrc.includes('applyFridgeScan') && appSrc.includes('leftover-scan-complete')) {
    pass('UI wires scan recommend note + leftover-scan-complete');
  } else {
    fail('Missing scan-recommend-note or applyFridgeScan wiring');
  }
}

{
  const { window } = bootApp();
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayIso = `${today.getFullYear()}-${mm}-${dd}`;

  window.dispatchEvent(new window.CustomEvent('leftover-scan-complete', {
    detail: {
      detectedIngredients: ['calabacin', 'zanahoria', 'cebolla', 'aceite', 'sal'],
      detectedPantry: [{ id: 'calabacin', grams: 300, expiresAt: todayIso }]
    }
  }));

  const modal = window.document.getElementById('modal-recipe-detail');
  const note = window.document.getElementById('scan-recommend-note');
  const title = window.document.getElementById('detail-title').textContent;
  const calaTag = Array.from(window.document.querySelectorAll('.pantry-tag')).find((tag) => /Calabacín/i.test(tag.textContent));
  const grams = calaTag && calaTag.querySelector('.tag-grams');
  const expiry = calaTag && calaTag.querySelector('.tag-expiry');
  const recommended = window.document.querySelector('.recipe-card-recommended');
  const alertBox = window.document.getElementById('pantry-expiry-alert');

  if (modal && !modal.classList.contains('hidden')) pass('Scan completion opens the recipe detail modal');
  else fail('Recipe detail modal stayed closed after scan');

  if (note && !note.classList.contains('hidden') && /Calabacín/i.test(note.textContent)) {
    pass('Recommend note explains the expiring calabacín');
  } else {
    fail(`Recommend note failed: hidden=${note && note.classList.contains('hidden')} text="${note && note.textContent}"`);
  }

  if (/calabacín|crema|verdura/i.test(title)) pass(`Opened recipe uses the urgent veg: "${title}"`);
  else fail(`Opened unexpected recipe title: "${title}"`);

  if (grams && grams.value === '300' && expiry && expiry.value === todayIso) {
    pass('Scanned calabacín lands in pantry with grams and expiry');
  } else {
    fail(`Pantry tag missing scan data grams=${grams && grams.value} expiry=${expiry && expiry.value}`);
  }

  if (recommended) pass('Recommended recipe card is highlighted in the grid');
  else fail('Missing .recipe-card-recommended after scan');

  if (alertBox && !alertBox.classList.contains('hidden') && /Calabacín/i.test(alertBox.textContent)) {
    pass('Expiry alert lists Calabacín after the scan');
  } else {
    fail(`Expiry alert failed: "${alertBox && alertBox.textContent}"`);
  }
}

console.log(failures === 0 ? '\n🎉 ALL SCAN → URGENT COOK CHECKS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
