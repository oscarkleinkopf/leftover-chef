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

console.log('=== SHOPPING LIST SUITE ===\n');

const api = loadRecipesApi();
const recipe = api.PRESETS_RECIPES[0];

{
  const plan = [{ recipe }, { recipe }];
  const emptyPantry = {};
  const list = api.buildShoppingList(plan, emptyPantry, recipe.portions);
  const firstId = recipe.requiredIngredients[0].id;
  const expected = recipe.requiredIngredients[0].amount * 2;
  const line = list.toBuy.find((i) => i.id === firstId);
  if (line && line.buyGrams === expected && line.requiredGrams === expected) {
    pass('Aggregates grams across repeated meals in the plan');
  } else {
    fail(`Aggregation failed: ${JSON.stringify(line)} expected buy=${expected}`);
  }
}

{
  const first = recipe.requiredIngredients[0];
  const pantry = {
    [first.id]: { id: first.id, grams: Math.round(first.amount / 2) }
  };
  const list = api.buildShoppingList([{ recipe }], pantry, recipe.portions);
  const line = list.toBuy.find((i) => i.id === first.id);
  const expectedBuy = first.amount - pantry[first.id].grams;
  if (line && line.buyGrams === expectedBuy) {
    pass('Subtracts quantified pantry grams from the shopping list');
  } else {
    fail(`Pantry subtraction failed: ${JSON.stringify(line)} expected ${expectedBuy}`);
  }
}

{
  const first = recipe.requiredIngredients[0];
  const pantry = { [first.id]: { id: first.id, grams: null } };
  const list = api.buildShoppingList([{ recipe }], pantry, recipe.portions);
  const covered = list.covered.find((i) => i.id === first.id);
  const buying = list.toBuy.find((i) => i.id === first.id);
  if (covered && !buying && covered.haveUnquantified) {
    pass('Unquantified pantry item is treated as already in the fridge');
  } else {
    fail(`Unquantified pantry handling failed covered=${!!covered} buying=${!!buying}`);
  }
}

{
  const plan = api.generateWeeklyMealPlan(['calabacin', 'zanahoria', 'patata', 'cebolla', 'aceite'], {}, { dayCount: 7 });
  if (plan.length === 14 && plan[0].dayLabel === 'Lunes' && plan[12].dayLabel === 'Domingo') {
    pass('7-day plan has 14 meals from Monday to Sunday');
  } else {
    fail(`7-day plan shape unexpected: length=${plan.length} first=${plan[0] && plan[0].dayLabel}`);
  }
}

{
  const text = api.formatShoppingListText({
    toBuy: [{ name: 'Tomate', buyGrams: 200, requiredGrams: 300, haveGrams: 100 }]
  }, 'Lista test');
  if (text.includes('200g de Tomate') && text.includes('Leftover Chef')) {
    pass('formatShoppingListText includes buy quantity and branding');
  } else {
    fail(`format text unexpected: ${text}`);
  }
}

function bootApp() {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  const storage = {};
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
  window.open = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {}, clearRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {}, beginPath() {}, arc() {}, stroke() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; }
  });
  window.eval(recipesJs);
  window.eval(scannerJs);
  window.eval(appJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return window;
}

{
  if (!html.includes('id="shopping-list"') || !html.includes('btn-shopping-whatsapp')) {
    fail('Meal plan modal missing shopping list markup');
  } else {
    pass('Shopping list markup present in meal plan modal');
  }

  const window = bootApp();
  const tomate = window.document.querySelector('[data-ingredient-id="tomate"]');
  const aceite = window.document.querySelector('[data-ingredient-id="aceite"]');
  if (tomate) tomate.querySelector('input[type="checkbox"]').click();
  const vegTabDone = true;
  const pantryTab = Array.from(window.document.querySelectorAll('.accordion-tab-btn'))
    .find((btn) => /Despensa/i.test(btn.textContent || btn.innerText || ''));
  if (pantryTab) pantryTab.click();
  const aceiteAfter = window.document.querySelector('[data-ingredient-id="aceite"]');
  if (aceiteAfter) aceiteAfter.querySelector('input[type="checkbox"]').click();

  const calabacin = window.document.querySelector('[data-ingredient-id="calabacin"]')
    || window.document.querySelector('[data-ingredient-id="tomate"]');
  if (!window.document.getElementById('btn-meal-plan')) {
    fail('Missing meal plan button');
  } else {
    window.document.getElementById('btn-meal-plan').click();
    const modal = window.document.getElementById('modal-meal-plan');
    const days = window.document.querySelectorAll('.meal-day-group');
    const listItems = window.document.querySelectorAll('#shopping-list li');
    const summary = window.document.getElementById('shopping-list-summary');
    if (modal && !modal.classList.contains('hidden') && days.length === 7 && listItems.length > 0 && summary && summary.textContent) {
      pass('Opening the weekly plan renders 7 days and a shopping list');
    } else {
      fail(`UI plan/list failed: hidden=${modal && modal.classList.contains('hidden')} days=${days.length} items=${listItems.length} summary="${summary && summary.textContent}" vegTab=${vegTabDone} aceite=${!!aceite}`);
    }
  }
}

console.log(failures === 0 ? '\n🎉 ALL SHOPPING LIST TESTS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
