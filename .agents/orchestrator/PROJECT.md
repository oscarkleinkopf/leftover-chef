# Project: Leftover Chef Strategic Roadmap Integration

## Architecture & Overview
Leftover Chef is a Single Page Application (SPA) built with HTML5, CSS3, and JavaScript (Vanilla JS), supported by a Service Worker for PWA capabilities.
This project expands Leftover Chef with a strategic evolution roadmap both in documentation (`ROADMAP.md`) and within the interactive web user interface (`index.html`, `css/styles.css`, `js/app.js`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Codebase Exploration & Requirements Analysis | Analyze current app structure, modal patterns, CSS variables, JS architecture, service worker setup. | none | DONE |
| 2 | M2: Strategic Architecture Specification (`ROADMAP.md`) | Write detailed `ROADMAP.md` covering Phase 2.0 (Cloud Firebase), Phase 3.0 (Computer Vision), Phase 4.0 (Recipe Social Network), Phase 5.0 (Thermomix Cookidoo), including Mermaid diagrams. | M1 | DONE |
| 3 | M3: Interactive Roadmap UI/UX Module | Implement roadmap modal/section, nav entry point, version cards (2.0 to 5.0), voting & interest tracking saved in localStorage. | M1, M2 | DONE |
| 4 | M4: QA, Offline PWA Verification & Git Integration | Verify zero console errors, offline PWA compatibility, test UI/UX, verify clean git status on main branch. | M2, M3 | DONE |

## Interface Contracts & UI Specs
- **Nav Button**: Menu item / header icon to open Roadmap Modal.
- **Roadmap Modal**: Modal dialog or full section containing:
  - Header with title and summary.
  - Phase cards (v2.0, v3.0, v4.0, v5.0) displaying key features, estimated release, and status tag.
  - Interactive "Vote / I'm Interested" button on each card or sub-feature.
  - LocalStorage key e.g. `leftoverchef_roadmap_votes` persisting votes across page reloads.
  - Accessibility & PWA offline cache compatibility.

## Code Layout
- Root directory: `c:\Users\oscar\.gemini\antigravity\scratch\Leftover-Chef`
  - `index.html` - App shell and modal structures
  - `css/` - Styling sheets
  - `js/` - Application logic & state management
  - `sw.js` / Service Worker assets - PWA caching configuration
  - `ROADMAP.md` - Technical specification document
