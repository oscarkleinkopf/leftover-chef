# Comprehensive CSS Architecture & PWA Caching Analysis for Roadmap Modal Integration

## Executive Summary
This document presents the codebase investigation conducted by Explorer 3 for Milestone 1 of the Leftover Chef Roadmap Integration project. It details the existing Vanilla CSS design system, modal component architecture, responsive breakpoints, color/theme properties, Service Worker cache configuration, and exact CSS/PWA additions required to implement the interactive Roadmap Modal (Milestones 2-4).

---

## 1. Codebase CSS Architecture & Design System

Leftover Chef employs a **Premium Dark Glassmorphism ("Cyberpunk / Cyber-Kitchen")** aesthetic implemented in standard Vanilla CSS (`css/styles.css`, 2195 lines, ~45.7 KB).

### 1.1 CSS Custom Properties (Root Color Tokens)
All visual tokens are declared on `:root` in `css/styles.css` (lines 6-35):

```css
:root {
  /* Color Palette - HSL Tokens */
  --bg-primary: hsl(222, 26%, 8%);         /* Main dark background (#0b0f19) */
  --bg-secondary: hsl(220, 25%, 12%);       /* Card & modal header background */
  --bg-tertiary: hsl(218, 24%, 18%);        /* Input & sub-card background */
  
  --neon-primary: hsl(160, 84%, 44%);       /* Neon Emerald (#10b981) - Primary accent */
  --neon-primary-glow: hsla(160, 84%, 44%, 0.3);
  --neon-secondary: hsl(343, 91%, 60%);     /* Neon Rose/Coral (#f43f5e) - Alert/Danger */
  --neon-secondary-glow: hsla(343, 91%, 60%, 0.3);
  --neon-accent: hsl(200, 95%, 55%);        /* Neon Cyan (#0ea5e9) - Secondary accent */
  --neon-accent-glow: hsla(200, 95%, 55%, 0.3);

  --text-primary: hsl(210, 20%, 98%);       /* High-contrast text */
  --text-secondary: hsl(215, 16%, 72%);     /* Subtitles and body labels */
  --text-muted: hsl(215, 12%, 50%);         /* Muted metadata */

  --glass-bg: hsla(220, 25%, 12%, 0.65);    /* Semi-transparent backdrop */
  --glass-border: hsla(210, 20%, 90%, 0.08); /* Subtle glass outline */
  --glass-highlight: hsla(210, 20%, 90%, 0.03);
  --glass-shadow: rgba(0, 0, 0, 0.5);

  --font-display: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --border-radius-lg: 20px;
  --border-radius-md: 12px;
  --border-radius-sm: 8px;
  --transition-smooth: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```

### 1.2 Glassmorphism Utility Class
Used by all cards and modals:
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px 0 var(--glass-shadow);
  border-radius: var(--border-radius-lg);
  transition: var(--transition-smooth);
}
```

---

## 2. Modal Component Architecture

Modals in `index.html` follow a consistent structural pattern (`#modal-settings`, `#modal-bookmarks`, `#modal-meal-plan`, `#modal-profiles`, `#modal-recipe-detail`).

### 2.1 Existing Modal CSS Framework (`css/styles.css:876-969`)

```css
/* Modals Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(5, 7, 12, 0.85);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  transition: opacity 0.3s ease;
}

/* Modal Dialog Box */
.modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--glass-border);
}

.modal-large {
  max-width: 900px;
}

/* Modal Entry Animation */
.animate-modal {
  animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--bg-secondary);
}

.close-modal-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  transition: var(--transition-smooth);
}
.close-modal-btn:hover {
  color: var(--neon-secondary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--glass-border);
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.hidden {
  display: none !important;
}
```

---

## 3. Responsive Breakpoints & Print Rules

Existing responsive rules in `css/styles.css`:
- `max-width: 1024px`: Converts main app 2-column layout to single column (`css/styles.css:320`).
- `max-width: 768px`: Tablet/mobile navigation and recipe grid adjustments (`css/styles.css:1140, 1227, 1421, 1548`).
- `max-width: 600px`: Mobile layout adjustments for meal cards, inputs, and button groups (`css/styles.css:688, 770, 1529, 2021, 2115`).
- `max-width: 480px`: Small screen title & header scaling (`css/styles.css:589`).
- `@media print`: Hides interactive elements and modal overlay, forcing light background and black text (`css/styles.css:2157-2192`).

---

## 4. PWA Service Worker & Manifest Analysis

### 4.1 Web App Manifest (`manifest.json`)
- **Name**: `Leftover Chef - Thermomix AI Assistant`
- **Short Name**: `LeftoverChef`
- **Start URL**: `./index.html`
- **Display**: `standalone`
- **Theme Color**: `#10b981`
- **Background Color**: `#0b0f19`
- **Icon**: `./icon.svg`

### 4.2 Service Worker Configuration (`service-worker.js`)
- **Cache Name**: `leftover-chef-v1`
- **Pre-cached Assets (`ASSETS_TO_CACHE`)**:
  1. `./`
  2. `./index.html`
  3. `./css/styles.css`
  4. `./js/recipes.js`
  5. `./js/scanner.js`
  6. `./js/app.js`
  7. `./icon.svg`
  8. `./manifest.json`

### 4.3 Service Worker Fetch & Offline Behavior
1. **Cache-First Strategy**: Intercepts requests, checks `caches.match(event.request)`. Returns cached version immediately if available.
2. **Network Fallback & Dynamic Caching**: If not in cache, fetches from network and dynamically puts HTTP 200 responses originating from same origin into cache.
3. **API Bypass**: Bypasses external calls to `generativelanguage.googleapis.com` (Google Gemini AI API).
4. **Offline HTML Fallback**: If network fails and request accepts `text/html`, falls back to `./index.html`.

---

## 5. Roadmap Modal UI Requirements & Recommended CSS Rules

To render the Roadmap modal (v2.0, v3.0, v4.0, v5.0) responsively, beautifully, and fully integrated with Leftover Chef's Cyber-Kitchen aesthetic, the following CSS rules must be added to `css/styles.css`:

### 5.1 Proposed Roadmap CSS Rules (To append to `css/styles.css`)

```css
/* ==========================================
   Roadmap Interactive Modal Components
   ========================================== */

/* Modal Container Override */
#modal-roadmap .modal {
  max-width: 950px;
  max-height: 92vh;
}

.roadmap-modal-header {
  border-bottom: 1px solid var(--glass-border);
}

.roadmap-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  color: var(--text-primary);
}

.roadmap-header-title span.roadmap-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 8px var(--neon-primary-glow));
}

/* Intro Banner Card */
.roadmap-intro-card {
  background: linear-gradient(135deg, hsla(220, 25%, 15%, 0.9), hsla(160, 84%, 44%, 0.08));
  border: 1px solid var(--neon-primary-glow);
  border-radius: var(--border-radius-md);
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.roadmap-intro-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.roadmap-intro-text h4 {
  font-size: 15px;
  color: var(--neon-primary);
  margin-bottom: 4px;
}

.roadmap-intro-text p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Timeline & Cards Layout */
.roadmap-timeline-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 768px) {
  .roadmap-timeline-grid {
    grid-template-columns: 1fr;
  }
}

.roadmap-phase-card {
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: var(--transition-smooth);
}

.roadmap-phase-card:hover {
  border-color: var(--neon-accent-glow);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.roadmap-phase-card.active-phase {
  border-color: var(--neon-primary);
  background: linear-gradient(180deg, var(--bg-secondary), hsla(160, 84%, 44%, 0.04));
}

.roadmap-phase-card.active-phase::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--neon-primary);
  box-shadow: 0 0 10px var(--neon-primary-glow);
}

/* Card Header & Badges */
.roadmap-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.roadmap-version-tag {
  background: var(--bg-tertiary);
  border: 1px solid var(--glass-border);
  color: var(--neon-accent);
  padding: 4px 10px;
  border-radius: var(--border-radius-sm);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.05em;
}

.roadmap-status-badge {
  padding: 4px 10px;
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-in-progress {
  background: var(--neon-primary-glow);
  color: var(--neon-primary);
  border: 1px solid var(--neon-primary);
}

.status-planned {
  background: var(--neon-accent-glow);
  color: var(--neon-accent);
  border: 1px solid var(--neon-accent);
}

.status-evaluating {
  background: var(--neon-secondary-glow);
  color: var(--neon-secondary);
  border: 1px solid var(--neon-secondary);
}

.status-concept {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: 1px solid var(--glass-border);
}

/* Card Content & Features List */
.roadmap-card-content h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.roadmap-card-content p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.roadmap-feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.roadmap-feature-tag {
  background: var(--glass-highlight);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
}

/* Card Footer & Interactive Voting */
.roadmap-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--glass-border);
}

.roadmap-release-date {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.btn-vote {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 8px 14px;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: var(--transition-smooth);
}

.btn-vote:hover {
  border-color: var(--neon-primary);
  color: var(--neon-primary);
  background: var(--neon-primary-glow);
}

.btn-vote.voted {
  background: var(--neon-primary);
  color: #0b0f19;
  border-color: var(--neon-primary);
  box-shadow: 0 0 12px var(--neon-primary-glow);
}

.btn-vote .vote-count {
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.btn-vote.voted .vote-count {
  background: rgba(11, 15, 25, 0.4);
  color: #0b0f19;
}

/* Responsive Overrides & Print Fix */
@media (max-width: 600px) {
  .roadmap-card-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .btn-vote {
    justify-content: center;
    width: 100%;
  }
}

@media print {
  #modal-roadmap {
    display: none !important;
  }
}
```

---

## 6. PWA Cache & Offline Readiness Recommendations

1. **Service Worker Version Increment**:
   - In `service-worker.js`, increment `CACHE_NAME` from `'leftover-chef-v1'` to `'leftover-chef-v2'`. This forces browsers and PWA clients to discard old static caches and download the updated HTML, CSS, and JS.
2. **Offline Vote Persistence**:
   - Store roadmap feature votes in `localStorage` (`leftoverchef_roadmap_votes`). Because `localStorage` is synchronous and local to the browser client, all voting operations work seamlessly 100% offline without needing active internet connection or backend APIs.
3. **Asset Auditing**:
   - Because the roadmap UI structure is built into `index.html`, `css/styles.css`, and `js/app.js`, no additional network request is generated when opening the modal. All static code is pre-cached upon Service Worker installation.
