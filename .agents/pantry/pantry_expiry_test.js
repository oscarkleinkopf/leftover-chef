const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.join(__dirname, '..', '..');
const recipesJs = fs.readFileSync(path.join(rootDir, 'js', 'recipes.js'), 'utf8');
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

console.log('=== PANTRY EXPIRY SUITE ===\n');

const api = loadRecipesApi();
const now = new Date('2026-08-15T12:00:00Z');

{
  const later = api.daysUntilExpiry('2026-08-17', now);
  const earlier = api.daysUntilExpiry('2026-08-15', now);
  if (later !== null && earlier !== null && later - earlier === 2) {
    pass('daysUntilExpiry: 2026-08-17 is 2 days after 2026-08-15');
  } else {
    fail(`daysUntilExpiry expected delta 2, got later=${later} earlier=${earlier}`);
  }
}

{
  const expired = api.getExpiryStatus('2026-08-14', now);
  const today = api.getExpiryStatus('2026-08-15', now);
  const urgent = api.getExpiryStatus('2026-08-17', now);
  const warn = api.getExpiryStatus('2026-08-20', now);
  const fresh = api.getExpiryStatus('2026-09-15', now);
  if (expired.level === 'expired' && today.level === 'expired' && urgent.level === 'urgent' && warn.level === 'warning' && fresh.level === 'fresh') {
    pass('getExpiryStatus maps expired/today/urgent/warning/fresh');
  } else {
    fail(`getExpiryStatus levels unexpected: ${JSON.stringify({ expired, today, urgent, warn, fresh })}`);
  }
}

{
  const days = api.daysUntilExpiry(api.defaultExpiryDate('tomate', now), now);
  if (days === 4) pass('defaultExpiryDate uses tomate shelfDays=4');
  else fail(`defaultExpiryDate tomate expected +4 days, got ${days}`);
}

{
  const recipe = api.PRESETS_RECIPES[0];
  const expiringId = recipe.requiredIngredients[0].id;
  const pantry = {
    [expiringId]: { id: expiringId, expiresAt: '2026-08-15' }
  };
  const available = recipe.requiredIngredients.map((i) => i.id);
  const base = api.calculateRecipeMatch(recipe, available);
  const withUrgency = api.applyPantryUrgency(base, recipe, pantry, now);
  if (withUrgency.urgencyBoost > 0 && withUrgency.urgentIngredientIds.includes(expiringId) && withUrgency.score === base.score) {
    pass('applyPantryUrgency flags expiring ingredients without lying about match %');
  } else {
    fail(`applyPantryUrgency unexpected: ${JSON.stringify(withUrgency)}`);
  }
}

{
  const pantry = {
    tomate: { id: 'tomate', expiresAt: '2026-08-15' },
    pollo: { id: 'pollo', expiresAt: '2026-08-16' },
    cebolla: { id: 'cebolla', expiresAt: '2026-10-01' }
  };
  const available = Object.keys(pantry);
  const ranked = api.findMatchingRecipes(available, pantry, [], now);
  if (ranked.length === 0) {
    fail('findMatchingRecipes returned no recipes');
  } else {
    const firstUrgent = (ranked[0].match.urgencyBoost || 0) >= (ranked[ranked.length - 1].match.urgencyBoost || 0);
    const topUsesExpiring = (ranked[0].match.urgentIngredientIds || []).length > 0;
    if (firstUrgent && topUsesExpiring) pass('findMatchingRecipes ranks recipes that use expiring pantry items first');
    else fail(`Ranking failed: top=${ranked[0].recipe.id} boost=${ranked[0].match.urgencyBoost}`);
  }
}

{
  const pantry = {
    tomate: { id: 'tomate', expiresAt: '2026-08-15' },
    patata: { id: 'patata', expiresAt: '2026-09-10' }
  };
  const list = api.listExpiringPantryItems(pantry, now, 2);
  if (list.length === 1 && list[0].id === 'tomate') pass('listExpiringPantryItems returns items within 48h');
  else fail(`listExpiringPantryItems unexpected: ${JSON.stringify(list)}`);
}

{
  try {
    const plan = api.generateWeeklyMealPlan(['tomate', 'pollo', 'cebolla', 'calabacin'], {
      tomate: { id: 'tomate', expiresAt: '2026-08-15' }
    });
    if (Array.isArray(plan) && plan.length === 14) pass('generateWeeklyMealPlan still returns 14 meals with pantry arg');
    else fail(`meal plan length unexpected: ${plan && plan.length}`);
  } catch (e) {
    fail(`generateWeeklyMealPlan threw: ${e.message}`);
  }
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
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, storage };
}

{
  const { window, storage } = bootApp();
  if (!window.document.getElementById('pantry-expiry-alert')) {
    fail('Missing #pantry-expiry-alert in DOM');
  } else {
    pass('Pantry alert container is present');
  }

  const tomateLabel = window.document.querySelector('[data-ingredient-id="tomate"]');
  if (!tomateLabel) {
    fail('Could not find Tomate checkbox in accordion');
  } else {
    tomateLabel.querySelector('input[type="checkbox"]').click();
    const tag = window.document.querySelector('.pantry-tag');
    const alertBox = window.document.getElementById('pantry-expiry-alert');
    const expiryInput = tag && tag.querySelector('.tag-expiry');
    if (tag && expiryInput && expiryInput.value) pass('Adding Tomate creates pantry tag with default expiry date');
    else fail('Pantry tag/expiry input missing after add');

    if (expiryInput) {
      const t = new Date();
      const mm = String(t.getMonth() + 1).padStart(2, '0');
      const dd = String(t.getDate()).padStart(2, '0');
      expiryInput.value = `${t.getFullYear()}-${mm}-${dd}`;
      expiryInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    const alertVisible = alertBox && !alertBox.classList.contains('hidden');
    const alertText = alertBox ? alertBox.textContent : '';
    if (alertVisible && /Tomate/i.test(alertText)) pass('Alert banner lists Tomate when it expires today');
    else fail(`Alert banner failed: visible=${alertVisible} text="${alertText}"`);

    const urgencyCard = window.document.querySelector('.urgency-use-badge');
    if (urgencyCard) pass('Recipe cards that use expiring items show urgency badge');
    else fail('No urgency badge on recipe cards after setting Tomate to expire today');

    const profiles = JSON.parse(storage.leftover_chef_profiles || '[]');
    const pantry = profiles[0] && profiles[0].pantry;
    const t = new Date();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    const todayIso = `${t.getFullYear()}-${mm}-${dd}`;
    if (pantry && pantry.tomate && pantry.tomate.expiresAt === todayIso) {
      pass('Pantry expiry persists on the active profile in localStorage');
    } else {
      fail(`Profile pantry persist failed: ${JSON.stringify(pantry)}`);
    }

    const gramsInput = window.document.querySelector('.tag-grams');
    if (gramsInput) {
      gramsInput.value = '250';
      gramsInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
    const profiles2 = JSON.parse(storage.leftover_chef_profiles || '[]');
    if (profiles2[0]?.pantry?.tomate?.grams === 250) pass('Pantry grams persist on the profile');
    else fail(`Grams persist failed: ${JSON.stringify(profiles2[0] && profiles2[0].pantry)}`);
  }
}

{
  const legacy = [{
    id: 'prof_default',
    name: 'Familia Principal',
    avatar: '👨‍👩‍👧‍👦',
    activeIngredients: ['pollo'],
    bookmarks: []
  }];
  const { window } = bootApp({
    leftover_chef_profiles: JSON.stringify(legacy),
    leftover_chef_active_profile_id: 'prof_default'
  });
  const tag = window.document.querySelector('.pantry-tag .tag-name');
  const expiry = window.document.querySelector('.tag-expiry');
  if (tag && /Pollo/i.test(tag.textContent) && expiry && expiry.value) {
    pass('Legacy profiles without pantry migrate IDs to dated pantry entries');
  } else {
    fail(`Legacy pantry migration failed: tag=${tag && tag.textContent} expiry=${expiry && expiry.value}`);
  }
}

console.log(failures === 0 ? '\n🎉 ALL PANTRY EXPIRY TESTS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
