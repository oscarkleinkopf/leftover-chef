# Leftover Chef — Roadmap Integration JavaScript & Architectural Analysis

**Target Project**: Leftover Chef (Thermomix AI Refrigerator Recipe Generator)  
**Author**: Explorer 2 (JavaScript & Architecture Specialist)  
**Date**: 2026-07-27  
**Working Directory**: `c:\Users\oscar\.gemini\antigravity\scratch\Leftover-Chef\.agents\teamwork_preview_explorer_m1_2`

---

## 1. Executive Summary

This report provides a detailed analysis of the Leftover Chef JavaScript architecture, state management patterns, modal control flows, `localStorage` usage, and DOM rendering methods. Based on these findings, we formulate an implementation strategy for the upcoming **Roadmap Feature** (Phases 2.0 through 5.0), including version cards, interactive voting, and persistent state under `leftoverchef_roadmap_votes`.

---

## 2. Codebase Inspection & Architectural Findings

### 2.1 File Map & Responsibilities
- **`index.html`** (685 lines): Single Page Application (SPA) structure. Contains top header navigation (`.header-actions`), main split layout (`.main-left` and `.main-right`), and multiple modal overlays (`#modal-settings`, `#modal-bookmarks`, `#modal-meal-plan`, `#modal-profiles`, `#modal-recipe-detail`) plus fullscreen cook mode overlay (`#cook-mode-overlay`).
- **`js/app.js`** (1,750 lines): Main application controller executed on `DOMContentLoaded`. Holds central `state`, DOM element references (`el`), storage functions (`loadPersistedData`), event listeners, and UI rendering logic.
- **`js/recipes.js`** (596 lines): Database of static ingredients (`INGREDIENT_DATABASE`), categories (`CATEGORIES`), presets (`PRESETS_RECIPES`), substitutions (`INGREDIENT_SWAPS`), matching algorithms, and meal plan procedural generators. Exports objects to `window`.
- **`js/scanner.js`** (401 lines): Photo scanning canvas engine (`FridgeScanner`) supporting simulated beam animation and Google Gemini AI API multimodal requests. Communicates with `app.js` via custom window events (`images-updated`).
- **`css/styles.css`** (2,195 lines): Central stylesheet defining glassmorphism theme variables, dark palette, animations (`modalIn`), modal layout frameworks (`.modal-overlay`, `.modal`, `.modal-large`), cards, badges, and responsive break points.
- **`server.js`** (73 lines): Zero-dependency Node.js static HTTP server serving files with `no-cache` headers.

---

### 2.2 State Management Pattern
- **Central State Location**: In `js/app.js` (lines 12–31), encapsulated inside the `DOMContentLoaded` closure:
  ```javascript
  const state = {
    activeIngredients: new Set(),      // Set of lowercase ingredient IDs
    customIngredients: [],              // Array of custom ingredient objects
    selectedDietFilters: new Set(),     // Selected dietary tags
    portions: 3,                        // Portions count
    selectedRecipe: null,               // Currently viewed recipe object
    cookStepIndex: 0,                   // Active step in Cook Mode
    bookmarks: [],                      // Saved recipes array
    timer: { ... },
    settings: { ... }
  };
  ```
- **Profiles State**: Stored in top-level closure variables `profiles` and `activeProfileId` (lines 1564–1567).
- **Reactivity Model**: Vanilla imperative updates. When state mutates (e.g. adding an ingredient or saving settings), developer explicitly calls corresponding render functions (`updateIngredientsUI()`, `renderRecipes()`, `renderOfflineAccordion()`, `saveProfiles()`).
- **Event Bus**: Custom browser events dispatched via `window.dispatchEvent(new CustomEvent('...'))` for decoupled notifications (e.g., image loading events from `scanner.js`).

---

### 2.3 LocalStorage Persistence Conventions
Existing keys currently stored in browser `localStorage`:
1. `leftover_chef_settings` — Object storing Gemini API key, mode active flag, default Thermomix model (`TM5` / `TM6`).
2. `leftover_chef_bookmarks` — Array of bookmarked recipe IDs.
3. `leftover_chef_profiles` — Array of profile objects containing profile IDs, names, avatars, active ingredients, and bookmarks.
4. `leftover_chef_active_profile_id` — String matching active profile ID.

**Key Conventions & Pattern**:
- All keys follow snake_case naming with prefix `leftover_chef_*`.
- Persistence functions utilize standard `JSON.stringify()` on save and `JSON.parse()` wrapped in `try { ... } catch (e) { ... }` or null-checks on load.
- Loading happens during bootstrap (`loadPersistedData()`), while saving happens upon state change or modal submission.

---

### 2.4 Modal Control Framework
- **DOM Structure**: Modals use `.modal-overlay` container with class `.hidden` (`display: none !important;`). Inside sits `.modal.glass.animate-modal` with `.modal-header`, `.modal-body`, and `.modal-footer`.
- **Open/Close Logic**:
  - **Open**: `modalElement.classList.remove('hidden')`
  - **Close**: `modalElement.classList.add('hidden')`
- **Backdrop Click closing**: Global loop over `.modal-overlay` elements at lines 1468–1474:
  ```javascript
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });
  ```
- **Header Trigger Buttons**: Bound via `addEventListener('click', ...)` in `app.js` (e.g. `el.btnSettings`, `el.btnBookmarks`, `btnProfiles`).

---

### 2.5 Dynamic UI Rendering Patterns
- Containers are selected via `document.getElementById()`.
- Dynamic rendering sequence:
  1. Clear container: `container.innerHTML = ''`.
  2. Iterate through data items.
  3. Instantiate elements via `document.createElement('div')` or construct HTML strings.
  4. Attach event handlers directly to child elements before appending to DOM.
  5. Append constructed children to container.

---

## 3. Roadmap Feature Design & Architecture

### 3.1 Overview of Roadmap Phases (Phase 2.0 to 5.0)
The Roadmap feature presents upcoming version release cards and allows community voting.
- **Phase 1.0 (Current)**: *Escáner de Refrígerador AI & Asistente Thermomix TM5/TM6*.
- **Phase 2.0**: *Planificador Semanal Inteligente & Lista de Compras Auto-Sincronizada*. Auto-generación de lista de faltantes, exportación directa a WhatsApp/PDF, integración con supermercados locales.
- **Phase 3.0**: *Comunidad Leftover Chef & Recetario Social Thermomix*. Intercambio de recetas personalizadas entre usuarios, valoraciones con estrellas, fotos de platillos cocinados.
- **Phase 4.0**: *Control por Voz Bidireccional & Modo Manos Libres Avanzado*. Asistente conversacional por voz para Thermomix, reconocimiento de gestos por cámara frontal.
- **Phase 5.0**: *IoT Direct Connect Thermomix TM6 API & Nutrición AI Médica*. Conexión directa vía WiFi a Thermomix TM6, análisis nutricional adaptativo según objetivos de salud y metabólicos.

---

### 3.2 State Structure Extension
In `js/app.js`, extend `state` or create a roadmap state module:
```javascript
state.roadmap = {
  userVotes: {}, // Map of { [phaseId]: boolean } e.g. { "v2_0": true, "v3_0": false }
  versions: [
    {
      id: 'v2_0',
      versionTag: 'v2.0',
      title: 'Planificador Semanal & Lista de Compras Inteligente',
      status: 'En Desarrollo',
      statusClass: 'status-in-progress',
      icon: '📅',
      summary: 'Organizador automático de menús para 7 días con optimización de sobrantes y exportación inteligente de lista de compras.',
      features: [
        'Generación de listas de compras agrupadas por pasillo',
        'Exportación instantánea a WhatsApp y PDF imprimible',
        'Cálculo automático de porciones para familias'
      ],
      baseVotes: 142
    },
    {
      id: 'v3_0',
      versionTag: 'v3.0',
      title: 'Comunidad & Recetario Social Thermomix',
      status: 'Planificado',
      statusClass: 'status-planned',
      icon: '👥',
      summary: 'Plataforma comunitaria para compartir recetas personalizadas, fotos de emplatado y valoraciones entre usuarios de Thermomix.',
      features: [
        'Feed público de recetas creadas por la comunidad',
        'Sistema de valoraciones y comentarios gastronómicos',
        'Perfiles de cocinero y medallas por rescate de comida'
      ],
      baseVotes: 98
    },
    {
      id: 'v4_0',
      versionTag: 'v4.0',
      title: 'Asistente de Voz Bidireccional & Control Gestual',
      status: 'Planificado',
      statusClass: 'status-planned',
      icon: '🎤',
      summary: 'Interacción manos libres completa durante el cocinado mediante comandos de voz conversacionales y gestos con la mano.',
      features: [
        'Dictado de voz bidireccional en tiempo real',
        'Control de temporizador por voz ("Pausar 2 minutos")',
        'Navegación de pasos por gestos frente a la cámara'
      ],
      baseVotes: 185
    },
    {
      id: 'v5_0',
      versionTag: 'v5.0',
      title: 'IoT Thermomix Direct Sync & IA Nutricional',
      status: 'Planificado',
      statusClass: 'status-planned',
      icon: '⚡',
      summary: 'Sincronización directa con modelos Thermomix TM6 vía API e inteligencia artificial de análisis metabólico y nutricional.',
      features: [
        'Envío automático de recetas a la pantalla de la TM6',
        'Planes de nutrición personalizados según metas de salud',
        'Detección automática de alérgenos y sustituciones IA'
      ],
      baseVotes: 215
    }
  ]
};
```

---

### 3.3 LocalStorage Persistence Specification
- **Required Storage Key**: `leftoverchef_roadmap_votes`
- **Data Structure**: Standard JSON string representing user voting state:
  ```json
  {
    "v2_0": true,
    "v3_0": false,
    "v4_0": true,
    "v5_0": false
  }
  ```
- **Load / Save Lifecycle**:
  - `loadRoadmapVotes()`: Executed during application initialization inside `loadPersistedData()`. Parses `localStorage.getItem('leftoverchef_roadmap_votes')` into `state.roadmap.userVotes`.
  - `saveRoadmapVotes()`: Executed whenever a user toggles a vote. Persists `JSON.stringify(state.roadmap.userVotes)` into `localStorage.setItem('leftoverchef_roadmap_votes', ...)`.

---

### 3.4 Modal HTML & Trigger Button Design

#### 1. Top Header Navigation Button (`index.html`)
Location: inside `<header class="app-header">` -> `<div class="header-actions">`:
```html
<button id="btn-roadmap" class="icon-btn" title="Roadmap de Futuras Versiones">
  <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 18l6-6-6-6"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
</button>
```

#### 2. Roadmap Modal Overlay (`index.html`)
Location: appended alongside existing modal overlays before `</body>`:
```html
<!-- ROADMAP VERSIONS & VOTING MODAL -->
<div class="modal-overlay hidden" id="modal-roadmap">
  <div class="modal glass modal-large animate-modal">
    <div class="modal-header">
      <div>
        <h2>🗺️ Roadmap de Versiones — Leftover Chef</h2>
        <p class="subtitle" style="font-size: 0.85rem; color: var(--text-secondary);">
          Vota las funcionalidades que más te gustaría ver en las próximas versiones de tu asistente Thermomix
        </p>
      </div>
      <button class="close-modal-btn" id="btn-close-roadmap">&times;</button>
    </div>
    <div class="modal-body">
      <div class="roadmap-grid" id="roadmap-grid">
        <!-- JS populates version cards dynamically -->
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="btn-close-roadmap-footer">Entendido</button>
    </div>
  </div>
</div>
```

---

### 3.5 Dynamic Rendering & Voting Logic (`js/app.js`)

```javascript
// Render function for Roadmap Version Cards
function renderRoadmap() {
  const grid = document.getElementById('roadmap-grid');
  if (!grid) return;
  grid.innerHTML = '';

  state.roadmap.versions.forEach(ver => {
    const hasVoted = !!state.roadmap.userVotes[ver.id];
    const currentVotes = ver.baseVotes + (hasVoted ? 1 : 0);

    const card = document.createElement('div');
    card.className = `roadmap-card glass ${hasVoted ? 'voted-card' : ''}`;
    
    card.innerHTML = `
      <div class="roadmap-card-header">
        <div class="roadmap-version-tag">${ver.icon} ${ver.versionTag}</div>
        <span class="badge ${ver.statusClass}">${ver.status}</span>
      </div>
      <h3 class="roadmap-title">${ver.title}</h3>
      <p class="roadmap-summary">${ver.summary}</p>
      <ul class="roadmap-features">
        ${ver.features.map(f => `<li><span class="feature-check">✓</span> ${f}</li>`).join('')}
      </ul>
      <div class="roadmap-card-footer">
        <span class="vote-count-display">👍 <strong id="vote-count-${ver.id}">${currentVotes}</strong> votos</span>
        <button class="btn ${hasVoted ? 'btn-primary' : 'btn-secondary'} btn-sm btn-vote" data-version-id="${ver.id}">
          ${hasVoted ? '✓ Votado' : '👍 Votar'}
        </button>
      </div>
    `;

    // Attach vote click handler
    const btnVote = card.querySelector('.btn-vote');
    btnVote.addEventListener('click', () => {
      toggleRoadmapVote(ver.id);
    });

    grid.appendChild(card);
  });
}

function toggleRoadmapVote(versionId) {
  const currentVote = !!state.roadmap.userVotes[versionId];
  state.roadmap.userVotes[versionId] = !currentVote;
  
  saveRoadmapVotes();
  renderRoadmap();
}

function loadRoadmapVotes() {
  const saved = localStorage.getItem('leftoverchef_roadmap_votes');
  if (saved) {
    try {
      state.roadmap.userVotes = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing leftoverchef_roadmap_votes:', e);
      state.roadmap.userVotes = {};
    }
  }
}

function saveRoadmapVotes() {
  try {
    localStorage.setItem('leftoverchef_roadmap_votes', JSON.stringify(state.roadmap.userVotes));
  } catch (e) {
    console.error('Error saving leftoverchef_roadmap_votes:', e);
  }
}
```

---

### 3.6 CSS Styling Specifications (`css/styles.css`)

```css
/* Roadmap Modal & Card Layout */
.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 20px;
}

.roadmap-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--glass-border);
  background: var(--bg-secondary);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.roadmap-card:hover {
  transform: translateY(-2px);
  border-color: var(--neon-primary);
}

.roadmap-card.voted-card {
  border-color: var(--neon-primary);
  background: rgba(16, 185, 129, 0.05);
}

.roadmap-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.roadmap-version-tag {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--neon-primary);
}

.status-in-progress {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.status-planned {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.roadmap-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.roadmap-summary {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 14px;
  line-height: 1.4;
}

.roadmap-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
}

.roadmap-features li {
  font-size: 0.85rem;
  color: var(--text-main);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-check {
  color: var(--neon-primary);
  font-weight: bold;
}

.roadmap-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--glass-border);
}

.vote-count-display {
  font-size: 0.9rem;
  color: var(--text-muted);
}
```

---

## 4. Key Recommendations & Implementation Checklist

1. **State Isolation**: Encapsulate roadmap voting in `state.roadmap` to avoid polluting recipe/ingredient state.
2. **Persistence Integrity**: Always wrap `JSON.parse` and `localStorage.setItem` in try/catch to gracefully handle `QuotaExceededError` or private browsing restrictions.
3. **Storage Key Guarantee**: Explicitly use key `leftoverchef_roadmap_votes` as requested in the specification.
4. **Modal Layout Compliance**: Follow standard Leftover Chef modal overlay structure (`.modal-overlay.hidden` with `.modal.glass.animate-modal`) to maintain UI consistency and backdrop click closing support.
5. **Accessibility Improvement**: Add global `Escape` key event listener in `app.js` to close active modal overlays.

---

## 5. Verification Method

To verify the Roadmap implementation:
1. Load Leftover Chef web application in browser (`http://localhost:3000` via `node server.js`).
2. Verify Roadmap button is visible in header.
3. Click button to trigger `#modal-roadmap` overlay; check smooth modal opening animation (`modalIn`).
4. Cast votes on Phase 2.0, 3.0, 4.0, or 5.0 cards; observe vote counter increment and button toggle (`✓ Votado`).
5. Open browser developer tools -> Application -> Local Storage -> inspect key `leftoverchef_roadmap_votes`.
6. Refresh page and verify vote selections persist across reloads.
