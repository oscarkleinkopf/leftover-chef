/**
 * Leftover Chef - Main Application Controller
 * Manages UI transitions, event bindings, state persistence,
 * and coordinates the scanning engine, matching algorithms, and cook timers.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const state = {
    activeIngredients: new Set(),      // Set of lowercase ingredient IDs
    customIngredients: [],              // Array of {id, name} manually created by user
    selectedDietFilters: new Set(),     // Selected dietary tags
    portions: 3,                        // Portions count
    selectedRecipe: null,               // Currently viewed recipe object
    cookStepIndex: 0,                   // Active step in Cook Mode
    bookmarks: [],                      // Saved recipes from localStorage
    timer: {
      intervalId: null,
      secondsRemaining: 0,
      totalSeconds: 0,
      isRunning: false
    },
    settings: {
      geminiModeActive: false,
      geminiApiKey: '',
      defaultTmModel: 'TM6'
    }
  };

  // Instantiate Photo Scanner
  const scanner = new FridgeScanner();

  // Speech Synthesis instance
  const synth = window.speechSynthesis;
  let activeUtterance = null;
  let voiceEnabled = true;

  // Voice Command Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let voiceCommandsActive = false;

  // ==========================================
  // 2. DOM ELEMENT REFERENCES
  // ==========================================
  const el = {
    // Header Actions
    btnSettings: document.getElementById('btn-settings'),
    btnBookmarks: document.getElementById('btn-bookmarks'),
    
    // Scanner
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    btnStartScan: document.getElementById('btn-start-scan'),
    btnCancelScan: document.getElementById('btn-cancel-scan'),
    thumbnailsQueue: document.getElementById('thumbnails-queue'),
    scannerActions: document.getElementById('scanner-actions'),
    scannerModeBadge: document.getElementById('scanner-mode-badge'),
    
    // Offline List
    manualInput: document.getElementById('manual-ingredient-input'),
    btnAddManual: document.getElementById('btn-add-manual'),
    accordionNav: document.getElementById('accordion-nav'),
    accordionPanel: document.getElementById('accordion-panel'),
    
    // Active Ingredients Cloud
    ingredientsCloud: document.getElementById('ingredients-cloud'),
    activeCount: document.getElementById('active-count'),
    btnClearAllIngredients: document.getElementById('btn-clear-all-ingredients'),
    
    // Filters & Recipe Output
    dietFilters: document.getElementById('diet-filters'),
    portionSelector: document.getElementById('portion-selector'),
    recipesGrid: document.getElementById('recipes-grid'),
    
    // Settings Modal
    modalSettings: document.getElementById('modal-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnResetSettings: document.getElementById('btn-reset-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    toggleGeminiMode: document.getElementById('toggle-gemini-mode'),
    apiKeyContainer: document.getElementById('api-key-container'),
    apiKeyInput: document.getElementById('api-key-input'),
    btnTogglePassword: document.getElementById('btn-toggle-password'),
    apiKeyStatus: document.getElementById('api-key-status'),
    
    // Bookmarks Modal
    modalBookmarks: document.getElementById('modal-bookmarks'),
    btnCloseBookmarks: document.getElementById('btn-close-bookmarks'),
    bookmarksModalBody: document.getElementById('bookmarks-modal-body'),
    
    // Recipe Detail Modal
    modalRecipeDetail: document.getElementById('modal-recipe-detail'),
    btnCloseDetail: document.getElementById('btn-close-detail'),
    btnCloseDetailFooter: document.getElementById('btn-close-detail-footer'),
    btnStartCooking: document.getElementById('btn-start-cooking'),
    btnBookmarkRecipe: document.getElementById('btn-bookmark-recipe'),
    detailTitle: document.getElementById('detail-title'),
    detailSubtitle: document.getElementById('detail-subtitle'),
    detailImage: document.getElementById('detail-image'),
    detailTime: document.getElementById('detail-time'),
    detailPortions: document.getElementById('detail-portions'),
    detailDifficulty: document.getElementById('detail-difficulty'),
    detailCompatibility: document.getElementById('detail-compatibility'),
    detailDietTags: document.getElementById('detail-diet-tags'),
    detailIngredientsList: document.getElementById('detail-ingredients-list'),
    detailAccessories: document.getElementById('detail-accessories'),
    detailStepsPreviewList: document.getElementById('detail-steps-preview-list'),
    
    // Nutrition Dials
    nutCalVal: document.getElementById('nut-cal-val'),
    nutCalStroke: document.getElementById('nut-cal-stroke'),
    nutProtVal: document.getElementById('nut-prot-val'),
    nutProtStroke: document.getElementById('nut-prot-stroke'),
    nutCarbsVal: document.getElementById('nut-carbs-val'),
    nutCarbsStroke: document.getElementById('nut-carbs-stroke'),
    nutFatVal: document.getElementById('nut-fat-val'),
    nutFatStroke: document.getElementById('nut-fat-stroke'),
    nutritionProfileTip: document.getElementById('nutrition-profile-tip'),
    
    // Cook Mode
    cookModeOverlay: document.getElementById('cook-mode-overlay'),
    btnExitCook: document.getElementById('btn-exit-cook'),
    btnToggleSpeech: document.getElementById('btn-toggle-speech'),
    btnSpeechRepeat: document.getElementById('btn-speech-repeat'),
    cookRecipeTitle: document.getElementById('cook-recipe-title'),
    cookStepCurrent: document.getElementById('cook-step-current'),
    cookStepTotal: document.getElementById('cook-step-total'),
    cookStepText: document.getElementById('cook-step-text'),
    paramSpeedVal: document.getElementById('param-speed-val'),
    paramReverse: document.getElementById('param-reverse'),
    paramSpeedLabel: document.getElementById('param-speed-label'),
    paramTempVal: document.getElementById('param-temp-val'),
    paramTempLabel: document.getElementById('param-temp-label'),
    paramAccessoryIcon: document.getElementById('param-accessory-icon'),
    paramAccessoryLabel: document.getElementById('param-accessory-label'),
    paramTimerCard: document.getElementById('param-timer-card'),
    paramTimerVal: document.getElementById('param-timer-val'),
    paramTimerStatus: document.getElementById('param-timer-status'),
    btnToggleTimer: document.getElementById('btn-toggle-timer'),
    btnCookPrev: document.getElementById('btn-cook-prev'),
    btnCookNext: document.getElementById('btn-cook-next'),
    cookProgressBar: document.getElementById('cook-progress-bar'),
    audioTimerDone: document.getElementById('audio-timer-done')
  };

  // ==========================================
  // 3. STORAGE & CONFIG PERSISTENCE
  // ==========================================
  function loadPersistedData() {
    // Load Settings
    const savedSettings = localStorage.getItem('leftover_chef_settings');
    if (savedSettings) {
      state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    }
    
    // Load Bookmarks
    const savedBookmarks = localStorage.getItem('leftover_chef_bookmarks');
    if (savedBookmarks) {
      state.bookmarks = JSON.parse(savedBookmarks);
    }

    // Sync UI with Loaded Settings
    el.toggleGeminiMode.checked = state.settings.geminiModeActive;
    el.apiKeyInput.value = state.settings.geminiApiKey;
    if (state.settings.geminiModeActive) {
      el.apiKeyContainer.classList.remove('collapsed');
      el.scannerModeBadge.innerText = 'Gemini AI Conectado';
      el.scannerModeBadge.className = 'badge badge-neon';
    } else {
      el.apiKeyContainer.classList.add('collapsed');
      el.scannerModeBadge.innerText = 'Simulador Activo';
      el.scannerModeBadge.className = 'badge badge-neon';
    }
    
    // Set default radio model TM5/TM6
    const radioModel = document.querySelector(`input[name="tm-model"][value="${state.settings.defaultTmModel}"]`);
    if (radioModel) radioModel.checked = true;
  }

  function saveSettings() {
    state.settings.geminiModeActive = el.toggleGeminiMode.checked;
    state.settings.geminiApiKey = el.apiKeyInput.value.trim();
    state.settings.defaultTmModel = document.querySelector('input[name="tm-model"]:checked')?.value || 'TM6';
    
    localStorage.setItem('leftover_chef_settings', JSON.stringify(state.settings));
    
    // Visual Updates
    if (state.settings.geminiModeActive) {
      el.scannerModeBadge.innerText = 'Gemini AI Conectado';
      el.scannerModeBadge.className = 'badge badge-neon';
    } else {
      el.scannerModeBadge.innerText = 'Simulador Activo';
      el.scannerModeBadge.className = 'badge badge-neon';
    }
    
    // Close Modal
    el.modalSettings.classList.add('hidden');
    renderRecipes(); // Re-render in case filter mode affected lists
  }

  // ==========================================
  // 4. PANTRY OFFLINE ACCORDION RENDER
  // ==========================================
  let activeCategoryKey = 'vegetables'; // Set default open category

  function renderOfflineAccordion() {
    el.accordionNav.innerHTML = '';
    
    // 1. Draw Category Selector Tabs
    Object.keys(window.CATEGORIES).forEach(key => {
      const cat = window.CATEGORIES[key];
      const tab = document.createElement('button');
      tab.className = `accordion-tab-btn ${key === activeCategoryKey ? 'active' : ''}`;
      tab.innerText = `${cat.icon} ${cat.name}`;
      tab.addEventListener('click', () => {
        activeCategoryKey = key;
        renderOfflineAccordion();
      });
      el.accordionNav.appendChild(tab);
    });

    // 2. Draw Checkable ingredient cards in the Panel for active category
    el.accordionPanel.innerHTML = '';
    const ingredients = window.INGREDIENT_DATABASE.filter(item => item.category === activeCategoryKey);
    
    ingredients.forEach(ing => {
      const isSelected = state.activeIngredients.has(ing.id);
      
      const label = document.createElement('label');
      label.className = `ingredient-checkbox-label ${isSelected ? 'selected' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          addIngredientToState(ing.id);
        } else {
          removeIngredientFromState(ing.id);
        }
      });

      label.appendChild(checkbox);
      
      const span = document.createElement('span');
      span.innerText = ing.name;
      label.appendChild(span);
      
      el.accordionPanel.appendChild(label);
    });
  }

  // ==========================================
  // 5. MANUAL TEXT ADDITIONS
  // ==========================================
  function handleManualAdd() {
    const text = el.manualInput.value.trim();
    if (!text) return;

    // Standardize text
    const cleanText = text.toLowerCase();
    
    // 1. Try finding in database
    const dbItem = window.INGREDIENT_DATABASE.find(item => item.name.toLowerCase() === cleanText || item.id === cleanText);
    
    if (dbItem) {
      addIngredientToState(dbItem.id);
    } else {
      // 2. If it's a completely unique user entry, construct a dynamic custom object
      const customId = 'custom_' + cleanText.replace(/\s+/g, '_');
      
      // Save in custom library if not exists
      if (!state.customIngredients.some(c => c.id === customId)) {
        state.customIngredients.push({ id: customId, name: text });
      }
      
      // Inject temporarily into global taxonomy database
      if (!window.INGREDIENT_DATABASE.some(i => i.id === customId)) {
        window.INGREDIENT_DATABASE.push({
          id: customId,
          name: text,
          category: 'pantry',
          kcal: 50, protein: 1, carbs: 10, fat: 0.5 // Default average estimates
        });
      }
      
      addIngredientToState(customId);
    }
    
    el.manualInput.value = '';
    el.manualInput.focus();
  }

  // ==========================================
  // 6. INGREDIENTS STATE MUTATORS & TAGS
  // ==========================================
  function addIngredientToState(id) {
    state.activeIngredients.add(id);
    updateIngredientsUI();
  }

  function removeIngredientFromState(id) {
    state.activeIngredients.delete(id);
    updateIngredientsUI();
  }

  function clearAllIngredients() {
    state.activeIngredients.clear();
    updateIngredientsUI();
  }

  function updateIngredientsUI() {
    el.activeCount.innerText = state.activeIngredients.size;
    el.ingredientsCloud.innerHTML = '';
    
    if (state.activeIngredients.size === 0) {
      el.ingredientsCloud.innerHTML = '<div class="empty-cloud-message">Ningún ingrediente seleccionado. Sube una foto o agrégalos en el panel offline inferior.</div>';
      renderRecipes();
      renderOfflineAccordion();
      return;
    }

    state.activeIngredients.forEach(id => {
      const ing = window.INGREDIENT_DATABASE.find(item => item.id === id);
      const name = ing ? ing.name : id;
      
      let badgeHtml = '';
      if (ing && ing.shelfDays !== undefined) {
        if (ing.shelfDays <= 3) {
          badgeHtml = `<span class="shelf-badge shelf-urgent">🔴 < ${ing.shelfDays}d</span>`;
        } else if (ing.shelfDays <= 7) {
          badgeHtml = `<span class="shelf-badge shelf-warning">🟡 < ${ing.shelfDays}d</span>`;
        } else {
          badgeHtml = `<span class="shelf-badge shelf-fresh">🟢 < ${ing.shelfDays}d</span>`;
        }
      }

      const tag = document.createElement('div');
      tag.className = 'ingredient-tag';
      tag.innerHTML = `${name} ${badgeHtml} <span class="remove-icon">&times;</span>`;
      tag.addEventListener('click', () => removeIngredientFromState(id));
      
      el.ingredientsCloud.appendChild(tag);
    });

    renderOfflineAccordion();
    renderRecipes();
  }

  // ==========================================
  // 7. PHOTO SCANNER EVENT LISTENERS & QUEUES
  // ==========================================
  
  // Dropzone drag & drop handlers
  el.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropzone.classList.add('hover');
  });
  
  el.dropzone.addEventListener('dragleave', () => {
    el.dropzone.classList.remove('hover');
  });
  
  el.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.dropzone.classList.remove('hover');
    if (e.dataTransfer.files.length > 0) {
      scanner.addImages(e.dataTransfer.files);
    }
  });

  el.dropzone.addEventListener('click', (e) => {
    // Avoid double trigger if clicking file buttons inside
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('.btn')) {
      el.fileInput.click();
    }
  });

  el.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      scanner.addImages(e.target.files);
    }
  });

  // Re-draw uploaded thumbnails carousels
  window.addEventListener('images-updated', () => {
    el.thumbnailsQueue.innerHTML = '';
    
    if (scanner.images.length === 0) {
      el.thumbnailsQueue.classList.add('hidden');
      el.scannerActions.classList.add('hidden');
      document.getElementById('dropzone-prompt').classList.remove('hidden');
      return;
    }

    document.getElementById('dropzone-prompt').classList.add('hidden');
    el.thumbnailsQueue.classList.remove('hidden');
    el.scannerActions.classList.remove('hidden');

    scanner.images.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail-preview';
      
      const image = document.createElement('img');
      image.src = img.dataUrl;
      thumb.appendChild(image);
      
      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-remove-thumb';
      btnRemove.innerHTML = '&times;';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        scanner.removeImage(img.id);
      });
      
      thumb.appendChild(btnRemove);
      el.thumbnailsQueue.appendChild(thumb);
    });
  });

  el.btnCancelScan.addEventListener('click', (e) => {
    e.stopPropagation();
    scanner.clearAll();
  });

  // RUNNING THE MAIN SCANNING ENGINE
  el.btnStartScan.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    if (state.settings.geminiModeActive) {
      // 1. AI Gemini Active Mode
      if (!state.settings.geminiApiKey) {
        alert('Por favor, ingresa tu clave API de Gemini en la configuración de la barra superior para usar el modo AI.');
        el.modalSettings.classList.remove('hidden');
        return;
      }

      // Draw standard laser scanning animations as UI feedback while connecting API!
      el.btnStartScan.disabled = true;
      el.btnCancelScan.disabled = true;
      
      // Start the scan beam visual animation
      scanner.startScanAnimation(() => {
        // Callback completes visualization, now let the actual REST call execute
      });

      const filters = Array.from(state.selectedDietFilters);
      
      await scanner.runGeminiAIScan(
        state.settings.geminiApiKey,
        filters,
        state.settings.defaultTmModel,
        (progressMessage) => {
          scanner.statusText.innerText = progressMessage;
        },
        (recipeData) => {
          // Success! Inject generated recipe into the feed and open detail immediately!
          scanner.stopScanAnimation();
          el.btnStartScan.disabled = false;
          el.btnCancelScan.disabled = false;
          
          // Add newly identified ingredients to active state
          if (recipeData.detectedIngredients) {
            recipeData.detectedIngredients.forEach(id => addIngredientToState(id));
          }
          
          // Display the recipe details directly
          openRecipeDetail(recipeData, 100);
          scanner.clearAll();
        },
        (errorMessage) => {
          // Fallback gracefully on failure (e.g. wrong key, quota exceed)
          scanner.stopScanAnimation();
          el.btnStartScan.disabled = false;
          el.btnCancelScan.disabled = false;
          
          alert(`La conexión con Gemini AI falló: ${errorMessage}. Activando el simulador de respaldo...`);
          
          // Trigger backup simulator scanning animation again to complete experience
          scanner.startScanAnimation((scannedIds) => {
            scannedIds.forEach(id => addIngredientToState(id));
            scanner.clearAll();
          });
        }
      );

    } else {
      // 2. Interactive Mock Simulation Mode
      el.btnStartScan.disabled = true;
      el.btnCancelScan.disabled = true;
      
      scanner.startScanAnimation((scannedIds) => {
        el.btnStartScan.disabled = false;
        el.btnCancelScan.disabled = false;
        
        // Add scanned items to state
        scannedIds.forEach(id => addIngredientToState(id));
        scanner.clearAll();
      });
    }
  });

  // ==========================================
  // 8. DYNAMIC RECIPE RECOMMENDATIONS ENGINE
  // ==========================================
  
  // Listeners on side filter chips
  el.dietFilters.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      if (state.selectedDietFilters.has(filter)) {
        state.selectedDietFilters.delete(filter);
        chip.classList.remove('active');
      } else {
        state.selectedDietFilters.add(filter);
        chip.classList.add('active');
      }
      renderRecipes();
    });
  });

  el.portionSelector.addEventListener('change', (e) => {
    state.portions = parseInt(e.target.value);
    renderRecipes();
  });

  function renderRecipes() {
    el.recipesGrid.innerHTML = '';
    
    if (state.activeIngredients.size === 0) {
      el.recipesGrid.innerHTML = `
        <div class="empty-recipes-placeholder">
          <div class="placeholder-icon">🍲</div>
          <h3>¿Qué cocinamos hoy?</h3>
          <p>Selecciona ingredientes a la izquierda o sube una foto para generar sugerencias gastronómicas perfectas para tu Thermomix.</p>
        </div>`;
      return;
    }

    const availableIdsArray = Array.from(state.activeIngredients);
    const dietFiltersArray = Array.from(state.selectedDietFilters);
    let matchedRecipesList = [];

    // 1. Score all curated preset recipes
    window.PRESETS_RECIPES.forEach(recipe => {
      const match = window.calculateRecipeMatch(recipe, availableIdsArray);
      
      // Filter by dietary options if specified
      let dietMatch = true;
      if (dietFiltersArray.length > 0) {
        dietMatch = dietFiltersArray.every(f => recipe.diet.includes(f));
      }

      if (dietMatch && match.score > 0) {
        matchedRecipesList.push({
          recipe: recipe,
          match: match
        });
      }
    });

    // 2. Dynamic Procedural AI Recipe fallback generator
    // If user has elements, always offer a highly custom procedurally designed cooking path!
    const proceduralRecipe = window.generateProceduralRecipe(availableIdsArray, dietFiltersArray);
    if (proceduralRecipe) {
      // Procedural recipe matches all active items by definition
      matchedRecipesList.push({
        recipe: proceduralRecipe,
        match: {
          score: 100,
          missingRequired: [],
          missingStaples: []
        }
      });
    }

    // Sort by descending compatibility score
    matchedRecipesList.sort((a, b) => b.match.score - a.match.score);

    if (matchedRecipesList.length === 0) {
      el.recipesGrid.innerHTML = `
        <div class="empty-recipes-placeholder">
          <div class="placeholder-icon">🥗</div>
          <h3>Sin recetas que coincidan</h3>
          <p>Tus ingredientes activos no alcanzan para formular estas recetas. Añade más verduras, carnes o pastas.</p>
        </div>`;
      return;
    }

    // Draw recipe cards
    matchedRecipesList.forEach(item => {
      const rec = item.recipe;
      const score = item.match.score;
      const missing = item.match.missingRequired;
      
      const card = document.createElement('div');
      card.className = 'card glass recipe-card';
      
      // Cover Image
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'recipe-image-wrapper';
      
      const img = document.createElement('img');
      img.src = rec.image;
      img.alt = rec.title;
      imgWrapper.appendChild(img);
      
      // Glowing Score Badge
      const scoreBadge = document.createElement('div');
      scoreBadge.className = 'match-ring-badge';
      scoreBadge.innerText = `${score}% Coincidencia`;
      imgWrapper.appendChild(scoreBadge);
      
      card.appendChild(imgWrapper);

      // Card Content
      const content = document.createElement('div');
      content.className = 'recipe-card-content';
      
      const title = document.createElement('h3');
      title.innerText = rec.title;
      content.appendChild(title);
      
      // Quick specs row
      const specs = document.createElement('div');
      specs.className = 'recipe-card-specs';
      specs.innerHTML = `
        <span>⏱️ ${rec.prepTime} min</span>
        <span>👥 ${state.portions} raciones</span>
        <span>📈 ${rec.difficulty}</span>
      `;
      content.appendChild(specs);

      // Missing ingredients warning
      if (missing.length > 0) {
        const missingNames = missing.map(m => {
          const dbItem = window.INGREDIENT_DATABASE.find(i => i.id === m.id);
          return dbItem ? dbItem.name : m.id;
        }).join(', ');
        
        const warning = document.createElement('div');
        warning.className = 'missing-warning-text';
        warning.innerHTML = `⚠️ Falta: ${missingNames}`;
        content.appendChild(warning);
      } else {
        const success = document.createElement('div');
        success.className = 'missing-warning-text';
        success.style.color = 'var(--neon-primary)';
        success.innerHTML = `✅ ¡Ingredientes completos!`;
        content.appendChild(success);
      }

      card.appendChild(content);

      // Detail Modal trigger
      card.addEventListener('click', () => {
        openRecipeDetail(rec, score);
      });

      el.recipesGrid.appendChild(card);
    });
  }

  // ==========================================
  // 9. RECIPE DETAIL & NUTRITION SVG CHARTS
  // ==========================================
  function openRecipeDetail(recipe, score) {
    state.selectedRecipe = recipe;
    
    // Scale standard quantities dynamically based on selected portion size!
    // Presets are built for a base portion count (e.g. 4 portions). Let's scale up/down.
    const basePortions = recipe.portions || 4;
    const scaleFactor = state.portions / basePortions;

    el.detailTitle.innerText = recipe.title;
    el.detailSubtitle.innerText = recipe.subtitle;
    el.detailImage.src = recipe.image;
    el.detailTime.innerText = `${recipe.prepTime} min`;
    el.detailPortions.innerText = `${state.portions} raciones`;
    el.detailDifficulty.innerText = recipe.difficulty;
    el.detailCompatibility.innerText = `${score}%`;

    // Diet tags
    el.detailDietTags.innerHTML = '';
    recipe.diet.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-neon';
      badge.style.marginRight = '6px';
      
      const tagLabels = {
        'vegan': '🌱 Vegano',
        'vegetarian': '🥚 Vegetariano',
        'gluten-free': '🌾 Sin Gluten',
        'low-carb': '🥩 Bajo Carb',
        'keto': '🧈 Keto'
      };
      
      badge.innerText = tagLabels[tag] || tag.toUpperCase();
      el.detailDietTags.appendChild(badge);
    });

    // Check off ingredients list
    el.detailIngredientsList.innerHTML = '';
    
    const availableIdsArray = Array.from(state.activeIngredients);
    
    recipe.requiredIngredients.forEach(req => {
      const isAvailable = availableIdsArray.includes(req.id);
      const scaledAmount = Math.round(req.amount * scaleFactor);
      
      const li = document.createElement('li');
      
      const icon = document.createElement('span');
      icon.className = `ing-check-icon ${isAvailable ? 'has' : 'missing'}`;
      icon.innerText = isAvailable ? '✓' : '✗';
      
      const text = document.createElement('span');
      // Replace quantity inside display string
      const dbItem = window.INGREDIENT_DATABASE.find(item => item.id === req.id);
      const name = dbItem ? dbItem.name : req.id;
      text.innerText = `${scaledAmount}g de ${name}`;
      
      li.appendChild(icon);
      li.appendChild(text);

      // AI Ingredient Swap Trigger
      const swaps = window.INGREDIENT_SWAPS?.[req.id];
      if (swaps && swaps.length > 0) {
        const swapBtn = document.createElement('button');
        swapBtn.className = 'swap-btn';
        swapBtn.innerText = '🔄 Sustituir';
        swapBtn.title = 'Ver alternativas gastronómicas';
        swapBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const alt = swaps[0];
          alert(`💡 Sustitución gastronómica para "${name}":\n\nPuedes sustituirlo por: ${alt.name}.\n\nConsejo Thermomix: ${alt.tip}`);
        });
        li.appendChild(swapBtn);
      }

      el.detailIngredientsList.appendChild(li);
    });

    // Equipment indicators
    el.detailAccessories.innerHTML = '';
    const accessories = new Set();
    recipe.steps.forEach(s => {
      if (s.tmSettings?.accessory) accessories.add(s.tmSettings.accessory);
    });
    
    accessories.forEach(acc => {
      const tag = document.createElement('div');
      tag.className = 'equip-tag';
      tag.innerText = acc;
      el.detailAccessories.appendChild(tag);
    });

    // Build Circular SVG Nutrition Progress Dials
    // Average reference targets per serving to calculate visual completion percent
    const refTargets = { kcal: 750, protein: 35, carbs: 100, fat: 28 };
    
    // Scale nutrition values by serving!
    // Presets contain total nutrition. Let's calculate per serving.
    // If it's a procedural recipe, total is already summed based on amounts.
    const isProcedural = recipe.id === 'procedural_custom' || recipe.id.startsWith('gemini_');
    const divisor = isProcedural ? state.portions : basePortions;
    
    const nut = recipe.nutrition;
    const servingKcal = Math.round(nut.kcal / divisor);
    const servingProt = Math.round(nut.protein / divisor);
    const servingCarbs = Math.round(nut.carbs / divisor);
    const servingFat = Math.round(nut.fat / divisor);

    el.nutCalVal.innerText = servingKcal;
    el.nutProtVal.innerText = `${servingProt}g`;
    el.nutCarbsVal.innerText = `${servingCarbs}g`;
    el.nutFatVal.innerText = `${servingFat}g`;

    // Trigger SVG dashboard dasharray transitions
    const setCircleStroke = (element, val, target) => {
      const percent = Math.min(100, Math.round((val / target) * 100));
      element.setAttribute('stroke-dasharray', `${percent}, 100`);
    };

    setCircleStroke(el.nutCalStroke, servingKcal, refTargets.kcal);
    setCircleStroke(el.nutProtStroke, servingProt, refTargets.protein);
    setCircleStroke(el.nutCarbsStroke, servingCarbs, refTargets.carbs);
    setCircleStroke(el.nutFatStroke, servingFat, refTargets.fat);

    // Nutrition recommendations tip text
    if (servingProt > 25) {
      el.nutritionProfileTip.innerHTML = '💡 <strong>Perfil Proteico Alto:</strong> Excelente plato constructor de masa muscular. Ideal para almuerzos post-entrenamiento.';
    } else if (servingCarbs > 70) {
      el.nutritionProfileTip.innerHTML = '💡 <strong>Perfil de Energía Rápida:</strong> Aporte alto en carbohidratos. Óptimo para jornadas con actividad física intensa.';
    } else if (servingFat > 20 && servingCarbs < 15) {
      el.nutritionProfileTip.innerHTML = '💡 <strong>Perfil Cetogénico:</strong> Muy bajo en carbohidratos y rico en grasas saludables. Perfecto para dietas Keto.';
    } else {
      el.nutritionProfileTip.innerHTML = '💡 <strong>Perfil Equilibrado:</strong> Aporte calórico y de macronutrientes balanceado. Recomendado como cena ligera o almuerzo standard.';
    }

    // 1. Calculate Sustainability Metrics
    let totalGramsSaved = 0;
    recipe.requiredIngredients.forEach(req => {
      if (availableIdsArray.includes(req.id)) {
        totalGramsSaved += req.amount * scaleFactor;
      }
    });

    const co2Saved = (totalGramsSaved * 2.5) / 1000; // 2.5 kg CO2 per kg food saved
    const moneySaved = totalGramsSaved * 0.008;      // ~$8 per kg food saved

    document.getElementById('sust-val-grams').innerText = `${Math.round(totalGramsSaved)}g`;
    document.getElementById('sust-val-co2').innerText = `${co2Saved.toFixed(1)} kg`;
    document.getElementById('sust-val-money').innerText = `$${moneySaved.toFixed(2)}`;

    // 2. Render Varoma Stack Visualizer
    const layerIds = ['bandeja', 'recipiente', 'cestillo', 'vaso'];
    layerIds.forEach(lId => {
      document.getElementById(`items-layer-${lId}`).innerText = 'Ninguno';
      document.getElementById(`stack-layer-${lId}`).classList.remove('active-layer');
    });

    const zoneGroups = {
      varoma_bandeja: [],
      varoma_base: [],
      cestillo: [],
      vaso: []
    };

    recipe.requiredIngredients.forEach(req => {
      const dbItem = window.INGREDIENT_DATABASE.find(item => item.id === req.id);
      const zone = dbItem ? (dbItem.zone || 'vaso') : 'vaso';
      const name = dbItem ? dbItem.name : req.id;
      if (zoneGroups[zone]) {
        zoneGroups[zone].push(name);
      }
    });

    if (zoneGroups.varoma_bandeja.length > 0) {
      document.getElementById('items-layer-bandeja').innerText = zoneGroups.varoma_bandeja.join(', ');
      document.getElementById('stack-layer-bandeja').classList.add('active-layer');
    }
    if (zoneGroups.varoma_base.length > 0) {
      document.getElementById('items-layer-recipiente').innerText = zoneGroups.varoma_base.join(', ');
      document.getElementById('stack-layer-recipiente').classList.add('active-layer');
    }
    if (zoneGroups.cestillo.length > 0) {
      document.getElementById('items-layer-cestillo').innerText = zoneGroups.cestillo.join(', ');
      document.getElementById('stack-layer-cestillo').classList.add('active-layer');
    }
    if (zoneGroups.vaso.length > 0) {
      document.getElementById('items-layer-vaso').innerText = zoneGroups.vaso.join(', ');
      document.getElementById('stack-layer-vaso').classList.add('active-layer');
    }

    // Bookmarks heart status check
    const isBookmarked = state.bookmarks.some(b => b.id === recipe.id);
    if (isBookmarked) {
      el.btnBookmarkRecipe.classList.add('active');
    } else {
      el.btnBookmarkRecipe.classList.remove('active');
    }

    // Static steps summary layout
    el.detailStepsPreviewList.innerHTML = '';
    recipe.steps.forEach(s => {
      const item = document.createElement('div');
      item.className = 'step-preview-item';
      
      const num = document.createElement('div');
      num.className = 'step-number-badge';
      num.innerText = s.step;
      
      const content = document.createElement('div');
      content.className = 'step-preview-content';
      
      const text = document.createElement('div');
      text.innerText = s.text;
      content.appendChild(text);
      
      if (s.tmSettings) {
        const settings = document.createElement('div');
        settings.className = 'step-preview-settings';
        const modelSuffix = state.settings.defaultTmModel;
        settings.innerText = `⚙️ ${modelSuffix} | ⏱️ ${s.tmSettings.time} | 🌡️ ${s.tmSettings.temp} | 🌀 ${s.tmSettings.speed} | ${s.tmSettings.accessory}`;
        content.appendChild(settings);
      }

      item.appendChild(num);
      item.appendChild(content);
      el.detailStepsPreviewList.appendChild(item);
    });

    el.modalRecipeDetail.classList.remove('hidden');
  }

  // Bookmarking recipes
  el.btnBookmarkRecipe.addEventListener('click', () => {
    if (!state.selectedRecipe) return;
    
    const rec = state.selectedRecipe;
    const isBookmarked = state.bookmarks.some(b => b.id === rec.id);
    
    if (isBookmarked) {
      // Remove
      state.bookmarks = state.bookmarks.filter(b => b.id !== rec.id);
      el.btnBookmarkRecipe.classList.remove('active');
    } else {
      // Add
      state.bookmarks.push(rec);
      el.btnBookmarkRecipe.classList.add('active');
    }
    
    localStorage.setItem('leftover_chef_bookmarks', JSON.stringify(state.bookmarks));
  });

  // Render bookmarked list in Modal
  function renderBookmarks() {
    el.bookmarksModalBody.innerHTML = '';
    
    if (state.bookmarks.length === 0) {
      el.bookmarksModalBody.innerHTML = '<p class="modal-desc" style="text-align:center; padding:40px 0;">No tienes recetas guardadas todavía.</p>';
      return;
    }

    state.bookmarks.forEach(rec => {
      const row = document.createElement('div');
      row.className = 'bookmark-row-item';
      
      const left = document.createElement('div');
      left.className = 'bookmark-row-left';
      left.innerHTML = `
        <h4>${rec.title}</h4>
        <p>⏱️ ${rec.prepTime} min | 📈 ${rec.difficulty}</p>
      `;
      row.appendChild(left);
      
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-delete-bookmark';
      btnDel.innerHTML = '🗑️';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        state.bookmarks = state.bookmarks.filter(b => b.id !== rec.id);
        localStorage.setItem('leftover_chef_bookmarks', JSON.stringify(state.bookmarks));
        renderBookmarks();
      });
      
      row.appendChild(btnDel);

      row.addEventListener('click', () => {
        el.modalBookmarks.classList.add('hidden');
        openRecipeDetail(rec, 100);
      });

      el.bookmarksModalBody.appendChild(row);
    });
  }

  // ==========================================
  // 10. INTERACTIVE COOK MODE SYSTEM
  // ==========================================
  
  el.btnStartCooking.addEventListener('click', () => {
    if (!state.selectedRecipe) return;
    
    // Close detail modal, open Cook Mode fullscreen
    el.modalRecipeDetail.classList.add('hidden');
    el.cookModeOverlay.classList.remove('hidden');
    
    // Initialize cooking steps
    state.cookStepIndex = 0;
    setupCookStep();
  });

  // Speech Recognition voice listener initialization
  function initSpeechRecognition() {
    if (!SpeechRecognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
      console.log('[Voice Recognition] Heard:', transcript);

      if (transcript.includes('siguiente') || transcript.includes('avanzar') || transcript.includes('continuar')) {
        el.btnCookNext.click();
      } else if (transcript.includes('atrás') || transcript.includes('anterior') || transcript.includes('volver')) {
        el.btnCookPrev.click();
      } else if (transcript.includes('repetir') || transcript.includes('escuchar')) {
        el.btnSpeechRepeat.click();
      } else if (transcript.includes('pausar') || transcript.includes('parar') || transcript.includes('detener')) {
        if (state.timer.isRunning) toggleTimer();
      } else if (transcript.includes('iniciar') || transcript.includes('empezar') || transcript.includes('correr') || transcript.includes('reanudar')) {
        if (!state.timer.isRunning) toggleTimer();
      }
    };

    recognition.onend = () => {
      if (voiceCommandsActive && state.selectedRecipe) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onerror = (e) => {
      console.log('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        voiceCommandsActive = false;
        updateMicUI();
      }
    };
  }

  function updateMicUI() {
    const micBtn = document.getElementById('btn-toggle-mic');
    const micStatus = micBtn.querySelector('.mic-status-label');
    const commandsHelper = document.getElementById('mic-commands-helper');

    if (voiceCommandsActive) {
      micBtn.classList.add('mic-listening');
      micStatus.innerText = 'Escuchando...';
      commandsHelper.classList.remove('hidden');
    } else {
      micBtn.classList.remove('mic-listening');
      micStatus.innerText = 'Micrófono Apagado';
      commandsHelper.classList.add('hidden');
    }
  }

  // Mic Toggle handler
  document.getElementById('btn-toggle-mic').addEventListener('click', () => {
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz no está soportado en este navegador. Utiliza Google Chrome, Safari o Microsoft Edge.');
      return;
    }

    if (!recognition) {
      initSpeechRecognition();
    }

    voiceCommandsActive = !voiceCommandsActive;
    if (voiceCommandsActive) {
      try {
        recognition.start();
        speakStepInstruction('Asistente manos libres activo. Puedes decir siguiente o atrás para navegar.');
      } catch (e) {}
    } else {
      try { recognition.stop(); } catch (e) {}
    }
    updateMicUI();
  });

  function setupCookStep() {
    const recipe = state.selectedRecipe;
    const step = recipe.steps[state.cookStepIndex];
    
    // Update labels
    el.cookRecipeTitle.innerText = recipe.title;
    el.cookStepCurrent.innerText = state.cookStepIndex + 1;
    el.cookStepTotal.innerText = recipe.steps.length;
    el.cookStepText.innerText = step.text;
    
    // Progress bar calculate
    const progressPercent = ((state.cookStepIndex + 1) / recipe.steps.length) * 100;
    el.cookProgressBar.style.width = `${progressPercent}%`;

    // Disable navigation boundaries
    el.btnCookPrev.disabled = state.cookStepIndex === 0;

    // Speeds & Giro Inverso dials TM5/TM6
    const settings = step.tmSettings;
    
    if (settings) {
      el.paramSpeedVal.innerText = settings.speed.replace('vel ', '');
      el.paramSpeedLabel.innerText = getSpeedLabel(settings.speed);
      
      if (settings.reverse) {
        el.paramReverse.classList.remove('hidden');
      } else {
        el.paramReverse.classList.add('hidden');
      }

      // Temperature dial
      el.paramTempVal.innerText = settings.temp.replace('°C', '');
      el.paramTempLabel.innerText = getTempLabel(settings.temp);

      // Accessory Dial
      el.paramAccessoryIcon.innerText = getAccessoryIcon(settings.accessory);
      el.paramAccessoryLabel.innerText = settings.accessory;

      // Timer calculation
      resetCookTimer(settings.time, step.timer);
    } else {
      // Fallback
      el.paramSpeedVal.innerText = '-';
      el.paramReverse.classList.add('hidden');
      el.paramSpeedLabel.innerText = 'Manual';
      el.paramTempVal.innerText = '-';
      el.paramTempLabel.innerText = 'Manual';
      el.paramAccessoryIcon.innerText = '🥣';
      el.paramAccessoryLabel.innerText = 'Ninguno';
      resetCookTimer('0', 0);
    }

    // Kid Chef Step Check
    const stepCard = document.querySelector('.cook-step-card');
    const tempVal = settings ? settings.temp : '';
    const speedVal = settings ? settings.speed : '';
    const isSafeStep = (!tempVal || tempVal === 'Listo' || parseInt(tempVal) <= 50) &&
                       (!speedVal || parseFloat(speedVal) <= 3);

    if (isKidModeActive && isSafeStep) {
      stepCard.classList.add('step-kid-friendly');
      const badge = document.createElement('div');
      badge.className = 'kid-badge';
      badge.innerHTML = '⭐ PASO APTO PARA NIÑOS (Sin Calor)';
      el.cookStepText.prepend(badge);
    } else {
      stepCard.classList.remove('step-kid-friendly');
    }

    // Navigation change trigger next/finish
    if (state.cookStepIndex === recipe.steps.length - 1) {
      el.btnCookNext.innerHTML = '🏁 Finalizar Cocinado';
    } else {
      el.btnCookNext.innerHTML = 'Siguiente Paso <span class="arrow">→</span>';
    }

    // Trigger Speech synthesis voice read-out automatically
    if (voiceEnabled) {
      speakStepInstruction(step.speechText || step.text);
    }
  }

  // Speech utility triggers
  function speakStepInstruction(text) {
    if (!synth) return;
    
    // Cancel existing speak cues
    synth.cancel();

    // Create Spanish voice utterance
    activeUtterance = new SpeechSynthesisUtterance(text);
    activeUtterance.lang = 'es-ES';
    activeUtterance.rate = 1.0;
    
    // Add glowing active effect to the voice badge
    activeUtterance.onstart = () => {
      el.btnToggleSpeech.classList.add('pulse-active');
    };
    
    activeUtterance.onend = () => {
      el.btnToggleSpeech.classList.remove('pulse-active');
    };

    synth.speak(activeUtterance);
  }

  el.btnToggleSpeech.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (voiceEnabled) {
      el.btnToggleSpeech.classList.add('active');
      el.btnToggleSpeech.querySelector('.speech-status-label').innerText = 'Voz Activa';
      const step = state.selectedRecipe.steps[state.cookStepIndex];
      speakStepInstruction(step.speechText || step.text);
    } else {
      el.btnToggleSpeech.classList.remove('active');
      el.btnToggleSpeech.querySelector('.speech-status-label').innerText = 'Voz Muteada';
      synth.cancel();
    }
  });

  el.btnSpeechRepeat.addEventListener('click', () => {
    const step = state.selectedRecipe.steps[state.cookStepIndex];
    speakStepInstruction(step.speechText || step.text);
  });

  // DIALS LABELS DESCRIPTIONS HELPERS
  function getSpeedLabel(speed) {
    const s = speed.toLowerCase();
    if (s.includes('progresiva')) return 'Triturado Progresivo';
    if (s.includes('cuchara')) return 'Remover Delicado';
    if (s.includes('1.5') || s.includes('2')) return 'Mezclar Suave';
    if (s.includes('3') || s.includes('4')) return 'Trocear / Batir';
    if (s.includes('5') || s.includes('6')) return 'Triturar Medio';
    if (s.includes('7') || s.includes('8') || s.includes('10')) return 'Triturado Sedoso';
    return 'Giro cuchillas';
  }

  function getTempLabel(temp) {
    const t = temp.toLowerCase();
    if (t.includes('varoma')) return 'Cocinando al Vapor';
    if (t.includes('120')) return 'Sofreír Aromas';
    if (t.includes('100')) return 'Hervir / Cocinar';
    if (t.includes('90')) return 'Cocción Lenta';
    if (t.includes('sin')) return 'Temperatura Ambiente';
    return 'Calentamiento';
  }

  function getAccessoryIcon(acc) {
    const a = acc.toLowerCase();
    if (a.includes('varoma')) return '💨';
    if (a.includes('mariposa')) return '🦋';
    if (a.includes('cestillo')) return '🧺';
    if (a.includes('espátula')) return '🥄';
    return '🔪';
  }

  // TIMER MANAGEMENT
  function resetCookTimer(timeStr, secondsOverride) {
    // Clear existing timer intervals
    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    el.paramTimerStatus.innerText = 'INICIAR';
    
    // Read seconds from timer override, or parse string like "5 min"
    let seconds = 0;
    if (secondsOverride && secondsOverride > 0) {
      seconds = secondsOverride;
    } else {
      const match = timeStr.match(/(\d+)\s*min/);
      const matchSeg = timeStr.match(/(\d+)\s*seg/);
      
      if (match) seconds += parseInt(match[1]) * 60;
      if (matchSeg) seconds += parseInt(matchSeg[1]);
    }

    state.timer.secondsRemaining = seconds;
    state.timer.totalSeconds = seconds;
    
    updateTimerDisplay();

    if (seconds === 0) {
      el.paramTimerCard.style.opacity = '0.4';
      el.paramTimerStatus.innerText = 'SIN TIEMPO';
    } else {
      el.paramTimerCard.style.opacity = '1';
    }
  }

  function updateTimerDisplay() {
    const m = Math.floor(state.timer.secondsRemaining / 60).toString().padStart(2, '0');
    const s = (state.timer.secondsRemaining % 60).toString().padStart(2, '0');
    el.paramTimerVal.innerText = `${m}:${s}`;
  }

  function toggleTimer() {
    if (state.timer.secondsRemaining <= 0) return;

    if (state.timer.isRunning) {
      // Pause
      clearInterval(state.timer.intervalId);
      state.timer.isRunning = false;
      el.paramTimerStatus.innerText = 'PAUSADO';
    } else {
      // Start
      state.timer.isRunning = true;
      el.paramTimerStatus.innerText = 'CORRIENDO';
      
      state.timer.intervalId = setInterval(() => {
        state.timer.secondsRemaining--;
        updateTimerDisplay();
        
        if (state.timer.secondsRemaining <= 0) {
          clearInterval(state.timer.intervalId);
          state.timer.isRunning = false;
          el.paramTimerStatus.innerText = 'TERMINADO';
          
          // Sound the alarm and flash red!
          if (el.audioTimerDone) {
            el.audioTimerDone.play().catch(e => console.log('Audio playback blocked: ', e));
          }
          
          // Double flash dial
          el.paramTimerCard.style.borderColor = 'var(--neon-secondary)';
          el.paramTimerCard.classList.add('pulse-active');
          speakStepInstruction('El tiempo del paso ha concluido.');
          
          setTimeout(() => {
            el.paramTimerCard.classList.remove('pulse-active');
            el.paramTimerCard.style.borderColor = 'var(--glass-border)';
          }, 4000);
        }
      }, 1000);
    }
  }

  el.btnToggleTimer.addEventListener('click', toggleTimer);

  // STEP BY STEP NAVIGATION
  el.btnCookPrev.addEventListener('click', () => {
    if (state.cookStepIndex > 0) {
      state.cookStepIndex--;
      setupCookStep();
    }
  });

  el.btnCookNext.addEventListener('click', () => {
    const recipe = state.selectedRecipe;
    
    if (state.cookStepIndex < recipe.steps.length - 1) {
      state.cookStepIndex++;
      setupCookStep();
    } else {
      // Finalize
      clearInterval(state.timer.intervalId);
      synth.cancel();
      el.cookModeOverlay.classList.add('hidden');
      if (recognition && voiceCommandsActive) {
        voiceCommandsActive = false;
        recognition.stop();
        updateMicUI();
      }
      
      // Complete celebratory speech
      speakStepInstruction('¡Felicidades! Has completado tu plato con Leftover Chef. Que tengas un excelente provecho.');
      alert('🎉 ¡Receta completada con éxito! Esperamos que disfrutes tu plato preparado en Thermomix.');
    }
  });

  el.btnExitCook.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas salir del asistente de cocinado?')) {
      clearInterval(state.timer.intervalId);
      synth.cancel();
      el.cookModeOverlay.classList.add('hidden');
      if (recognition && voiceCommandsActive) {
        voiceCommandsActive = false;
        recognition.stop();
        updateMicUI();
      }
    }
  });

  // ==========================================
  // 11. GENERAL MODAL OPEN/CLOSE TRIGGERS
  // ==========================================
  
  // Settings modal
  el.btnSettings.addEventListener('click', () => {
    loadPersistedData();
    el.modalSettings.classList.remove('hidden');
  });
  
  el.btnCloseSettings.addEventListener('click', () => {
    el.modalSettings.classList.add('hidden');
  });

  el.btnSaveSettings.addEventListener('click', saveSettings);

  el.btnResetSettings.addEventListener('click', () => {
    if (confirm('¿Restaurar configuración predeterminada?')) {
      el.toggleGeminiMode.checked = false;
      el.apiKeyInput.value = '';
      el.apiKeyContainer.classList.add('collapsed');
      saveSettings();
    }
  });

  // Settings api key sub-menu transitions
  el.toggleGeminiMode.addEventListener('change', (e) => {
    if (e.target.checked) {
      el.apiKeyContainer.classList.remove('collapsed');
    } else {
      el.apiKeyContainer.classList.add('collapsed');
    }
  });

  el.btnTogglePassword.addEventListener('click', () => {
    if (el.apiKeyInput.type === 'password') {
      el.apiKeyInput.type = 'text';
      el.btnTogglePassword.innerText = '🔒';
    } else {
      el.apiKeyInput.type = 'password';
      el.btnTogglePassword.innerText = '👁️';
    }
  });

  // Bookmarks modal
  el.btnBookmarks.addEventListener('click', () => {
    renderBookmarks();
    el.modalBookmarks.classList.remove('hidden');
  });
  el.btnCloseBookmarks.addEventListener('click', () => {
    el.modalBookmarks.classList.add('hidden');
  });

  // Recipe Detail Modal Close
  el.btnCloseDetail.addEventListener('click', () => {
    el.modalRecipeDetail.classList.add('hidden');
  });
  el.btnCloseDetailFooter.addEventListener('click', () => {
    el.modalRecipeDetail.classList.add('hidden');
  });

  // Offline checklist search bindings
  el.manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleManualAdd();
    }
  });
  el.btnAddManual.addEventListener('click', handleManualAdd);

  el.btnClearAllIngredients.addEventListener('click', clearAllIngredients);

  // Exporters click events
  document.getElementById('btn-export-whatsapp').addEventListener('click', () => {
    if (!state.selectedRecipe) return;
    const missingList = getMissingIngredientsList();
    if (missingList.length === 0) {
      alert('¡Tienes todos los ingredientes necesarios para esta receta!');
      return;
    }
    
    const message = `¡Hola! Me faltan estos ingredientes para cocinar la receta "${state.selectedRecipe.title}" en la Thermomix:\n\n` + 
                    missingList.map(m => `• ${m}`).join('\n') + 
                    `\n\nGenerado con Leftover Chef 🍳`;
                    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  });

  document.getElementById('btn-export-clipboard').addEventListener('click', () => {
    if (!state.selectedRecipe) return;
    const missingList = getMissingIngredientsList();
    if (missingList.length === 0) {
      alert('¡Tienes todos los ingredientes necesarios para esta receta!');
      return;
    }
    
    const text = `Ingredientes faltantes para "${state.selectedRecipe.title}":\n` + 
                 missingList.map(m => `- ${m}`).join('\n');
                 
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Lista de ingredientes copiada al portapapeles.');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
    });
  });

  function getMissingIngredientsList() {
    const availableIdsArray = Array.from(state.activeIngredients);
    const basePortions = state.selectedRecipe.portions || 4;
    const scaleFactor = state.portions / basePortions;
    const missing = [];

    state.selectedRecipe.requiredIngredients.forEach(req => {
      if (!availableIdsArray.includes(req.id)) {
        const dbItem = window.INGREDIENT_DATABASE.find(item => item.id === req.id);
        const name = dbItem ? dbItem.name : req.id;
        const scaledAmount = Math.round(req.amount * scaleFactor);
        missing.push(`${scaledAmount}g de ${name}`);
      }
    });
    return missing;
  }

  // Close modals when clicking overlay backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });

  // ==========================================
  // 12. BOOTSTRAP INITIALIZATION
  // ==========================================
  loadPersistedData();
  renderOfflineAccordion();
  updateIngredientsUI(); // Trigger initial recipes list state (empty warning)

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('[PWA] Service Worker registrado con éxito:', reg.scope))
        .catch(err => console.error('[PWA] Falló el registro del Service Worker:', err));
    });
  }

});
