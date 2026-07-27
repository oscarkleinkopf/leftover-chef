# Leftover Chef - Roadmap Integration Analysis (Milestone 1)

## Executive Summary
This document presents an architectural and DOM structure analysis of `index.html`, `css/styles.css`, and `js/app.js` in the **Leftover Chef** codebase. The objective is to define the optimal, clean integration strategy for an interactive "Roadmap" navigation control and Roadmap Modal.

---

## 1. Current DOM & Architecture Inspection

### 1.1 Root Layout (`index.html`)
The application structure follows a clean single-page web app pattern:
- **Background Layer**: `.ambient-glow` elements (lines 23-25).
- **Main Container Shell**: `.app-container` (lines 28-187), containing:
  - `<header class="app-header">`: Top navigation header containing branding logo/text (`.brand`) and navigation control buttons (`.header-actions`).
  - `<main class="app-main">`: Grid layout split into `.main-left` (Photo Scanner Card & Offline Ingredients Card) and `.main-right` (Active Ingredients Cloud, Preference Filters, and Recipes Section Header & Grid).
- **Modal Overlays Layer**: Sits at the root level of `<body>` (outside `.app-container`, lines 190-550):
  - `#modal-settings` (AI Engine Configuration & Gemini API Key)
  - `#modal-bookmarks` (Saved Recipes List)
  - `#modal-meal-plan` (3-Day Zero Waste Meal Plan)
  - `#modal-profiles` (Multi-user & Family Profiles)
  - `#modal-recipe-detail` (Interactive Recipe Details & Nutrition visualizer)
  - `#cook-mode-overlay` (Fullscreen Step-by-Step Cooking Assistant)

### 1.2 Header & Navigation Bar (`<header class="app-header">`)
Located at lines 31-52 of `index.html`:
```html
<header class="app-header">
  <div class="brand">
    <div class="logo-icon">🍳</div>
    <div class="brand-text">
      <h1>Leftover <span class="highlight">Chef</span></h1>
      <p class="subtitle">Asistente AI para tu Thermomix</p>
    </div>
  </div>
  <div class="header-actions">
    <button id="btn-profiles" class="btn btn-secondary btn-sm profile-pill" title="Cambiar de Familia / Refrigerador">...</button>
    <button id="btn-bookmarks" class="icon-btn" title="Recetas Guardadas">...</button>
    <button id="btn-settings" class="icon-btn" title="Configuración de IA">...</button>
  </div>
</header>
```

### 1.3 Modal Mechanics & Framework
1. **Overlay & Styling**:
   - Overlays use `.modal-overlay.hidden` with `position: fixed`, high `z-index: 100`, backdrop blur, and flex centering (`css/styles.css` lines 877-891).
   - Modal boxes use `.modal.glass.animate-modal` (or `.modal-large` for wider views) with entry animation `@keyframes modalIn`.
2. **Open / Close Logic**:
   - Visibility is controlled by adding or removing the `.hidden` utility class (`display: none !important;`).
   - Backdrop clicks are handled globally in `js/app.js` (lines 1468-1474):
     ```javascript
     document.querySelectorAll('.modal-overlay').forEach(overlay => {
       overlay.addEventListener('click', (e) => {
         if (e.target === overlay) overlay.classList.add('hidden');
       });
     });
     ```
   - Each modal contains a header close button `<button class="close-modal-btn" id="btn-close-...">&times;</button>` and modal footer action button(s).

---

## 2. Roadmap Navigation Button Integration Recommendations

### Recommended Location
Insert the new Roadmap navigation button inside `<div class="header-actions">` in `<header class="app-header">` (line 39 of `index.html`), positioned between `#btn-profiles` and `#btn-bookmarks` (or after `#btn-bookmarks`).

### Button Format Options
1. **Option A: Icon Button Format (Matches `#btn-bookmarks` & `#btn-settings`)**
   ```html
   <button id="btn-roadmap" class="icon-btn" title="Roadmap del Proyecto">
     <svg class="svg-icon" viewBox="0 0 24 24">
       <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zm0 2.24l4 2v11.52l-4-2V5.24zM5 7.36l2-1v11.52l-2 1V7.36zm14 9.28l-2 1V6.12l2-1v11.52z"/>
     </svg>
   </button>
   ```
2. **Option B: Pill / Text Button Format (Matches `#btn-profiles`)**
   ```html
   <button id="btn-roadmap" class="btn btn-secondary btn-sm" title="Roadmap del Proyecto" style="display: flex; align-items: center; gap: 6px;">
     <span>🗺️</span>
     <span>Roadmap</span>
   </button>
   ```

*Recommendation*: **Option B (Pill / Text Button)** or **Option A (Icon Button with Map SVG)**. Option B provides immediate clarity to users regarding the Roadmap feature, while Option A keeps the header compact on narrow mobile screens.

---

## 3. Roadmap Modal Integration Recommendations

### Proposed HTML Structure & Placement
Place `#modal-roadmap` as a top-level overlay directly before `#modal-recipe-detail` (around line 338 of `index.html`):

```html
<!-- ROADMAP & PROJECT DEVELOPMENT MODAL -->
<div class="modal-overlay hidden" id="modal-roadmap">
  <div class="modal glass modal-large animate-modal">
    <div class="modal-header">
      <div>
        <h2>🗺️ Roadmap de Desarrollo - Leftover Chef</h2>
        <p class="subtitle" style="font-size: 0.85rem; color: var(--text-secondary);">Evolución del proyecto, hitos y próximas características</p>
      </div>
      <button class="close-modal-btn" id="btn-close-roadmap">&times;</button>
    </div>
    
    <div class="modal-body" id="roadmap-modal-body">
      <!-- Interactive Roadmap content sections -->
      <div class="roadmap-timeline">
        <!-- Milestone cards loaded or pre-rendered here -->
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn btn-primary" id="btn-close-roadmap-footer">Cerrar</button>
    </div>
  </div>
</div>
```

---

## 4. JavaScript Integration Plan

1. **Element References (`js/app.js`)**:
   Add references to `el` object:
   ```javascript
   modalRoadmap: document.getElementById('modal-roadmap'),
   btnRoadmap: document.getElementById('btn-roadmap'),
   btnCloseRoadmap: document.getElementById('btn-close-roadmap'),
   btnCloseRoadmapFooter: document.getElementById('btn-close-roadmap-footer'),
   ```

2. **Event Listeners**:
   ```javascript
   // Roadmap Modal Listeners
   if (el.btnRoadmap) {
     el.btnRoadmap.addEventListener('click', () => {
       el.modalRoadmap.classList.remove('hidden');
     });
   }
   if (el.btnCloseRoadmap) {
     el.btnCloseRoadmap.addEventListener('click', () => {
       el.modalRoadmap.classList.add('hidden');
     });
   }
   if (el.btnCloseRoadmapFooter) {
     el.btnCloseRoadmapFooter.addEventListener('click', () => {
       el.modalRoadmap.classList.add('hidden');
     });
   }
   ```
3. Automatic backdrop handling already functions out-of-the-box via `document.querySelectorAll('.modal-overlay')`.

---

## 5. Architectural Alignment Matrix

| Component | Target Location in DOM | CSS Class Strategy | JS Handler Strategy |
|---|---|---|---|
| **Roadmap Button** | `index.html:39` inside `.header-actions` | `.icon-btn` or `.btn.btn-secondary.btn-sm` | `el.btnRoadmap.addEventListener('click')` |
| **Roadmap Modal** | `index.html:338` (Root child of `<body>`) | `.modal-overlay.hidden`, `.modal.glass.modal-large.animate-modal` | `el.modalRoadmap.classList.remove/add('hidden')` |
| **Close Triggers** | `modal-header` & `modal-footer` inside `#modal-roadmap` | `.close-modal-btn`, `.btn.btn-primary` | Standard click listeners toggle `.hidden` |
