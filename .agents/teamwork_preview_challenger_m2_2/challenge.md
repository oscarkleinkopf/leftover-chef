# Adversarial Challenge Report: ROADMAP.md (v1.0 → v5.0)

**Target Document**: `ROADMAP.md` (Version 2.0.0-Master)  
**Evaluator**: Challenger 2 (Empirical Challenger)  
**Date**: 2026-07-27  

---

## Challenge Summary

**Overall Risk Assessment**: **HIGH**

While `ROADMAP.md` provides an ambitious, well-structured, and comprehensive vision for transforming Leftover Chef from a local-first Single Page Application into a cloud-connected, computer-vision-enabled, social, and IoT kitchen platform, **critical technical impossibilities, security flaws, and schema contradictions exist** across Phase 2.0 through Phase 5.0.

Specifically:
1. **Phase 5.0 IoT Connectivity Flaw**: Browser Web APIs strictly prohibit mutual TLS (mTLS) client certificate configuration on WebSockets (`wss://thermomix.local:8443`) and reject self-signed/local mDNS TLS certificates, breaking the hardware sync protocol in standard PWAs.
2. **Phase 4.0 Firestore Security Rules Breakdown**: Appendix A rules (`match /users/{userId} { allow read: if isOwner(userId); }`) block users from reading public profiles of recipe creators, and lack permissions for social feeds, followers, and notifications.
3. **Rating & Metric Spoofing Vulnerability**: `firestore.rules` prohibits non-authors from updating recipe metrics (`likesCount`, `reviewsCount`), while allowing authors to arbitrarily spoof 5-star ratings and fake metric counts without validation.
4. **Schema Lineage Gap (Phase 4.0 → Phase 5.0)**: `RecipeDocument` (Appendix B.1) lacks Thermomix execution metadata (`attachment`, `direction`, `mode`, `scaleTare`), rendering community recipes uncompilable by the `TMGC-v2` payload compiler (Appendix B.2).
5. **Hardware Safety Violation**: `TMGC-v2` payloads permit unsafe combinations (e.g. speed 10.0 at 120°C), violating Principle 4 thermal and mechanical safety guarantees.

---

## Challenges

### [Critical] Challenge 1: Web Browser WebAPI Limitations Block Phase 5.0 mTLS WebSocket Protocol (`wss://thermomix.local:8443`)

- **Assumption Challenged**: Section 3.5.1 & Section 2.3 assume a browser-based PWA can open a direct mutual TLS (mTLS) WebSocket connection (`wss://thermomix.local:8443`) to a local Thermomix appliance over Wi-Fi.
- **Attack / Failure Scenario**:
  1. The browser JavaScript execution context runs `new WebSocket('wss://thermomix.local:8443')`.
  2. The standard W3C `WebSocket` API does **not** support client TLS certificates (mTLS). There is no API parameter or hook to supply client certificates in web browsers.
  3. Browsers strictly enforce public Certificate Authority (CA) trust chains for `wss://` origins. A local appliance with a self-signed or internal CA certificate will trigger `ERR_CERT_AUTHORITY_INVALID` and fail to handshake.
- **Blast Radius**: Complete failure of Phase 5.0 direct hardware pairing and telemetry stream in web browsers.
- **Mitigation**:
  - Architecture modification: Introduce an optional local companion relay daemon (Node.js/desktop/mobile wrapper) that manages native mTLS socket connections.
  - Or, shift appliance communication to use Vorwerk Cookidoo Cloud Gateway WebSocket proxy instead of direct local mTLS from the browser.

---

### [Critical] Challenge 2: Firestore Security Rules Block Public Profiles and Social Graph in Phase 4.0

- **Assumption Challenged**: Section 3.4 assumes users can view creator profiles (`@handle`, bio, stats) and access social feeds/followers via Firestore.
- **Attack / Failure Scenario**:
  1. Appendix A `firestore.rules` defines:
     ```javascript
     match /users/{userId} {
       allow read, write: if isOwner(userId);
     }
     ```
  2. When User A attempts to view User B's creator profile or recipe author card, Firestore evaluates `isOwner(userId)` (`request.auth.uid == UserB`), which fails (`false`).
  3. The read request is rejected with `PERMISSION_DENIED`.
  4. Furthermore, `firestore.rules` completely lacks rules for `/users/{userId}/feed`, `/users/{userId}/followers`, or `/notifications`.
- **Blast Radius**: All social discovery, chef profiles, follower lists, and community feed interactions fail at the database security level.
- **Mitigation**:
  - Restructure public profile data into a dedicated `/profiles/{userId}` collection with `allow read: if true;`.
  - Add explicit rules for social subcollections (`/users/{userId}/feed`, `/followers/{userId}`) permitting authorized cross-user writes via security rules or Cloud Functions.

---

### [High] Challenge 3: Unprotected Social Metrics Allow Rating Spoofing & Block Review Increments

- **Assumption Challenged**: Section 3.4.1 & Appendix B.1 assume `likesCount`, `reviewsCount`, and `averageRating` on `RecipeDocument` can be maintained accurately by community users.
- **Attack / Failure Scenario**:
  1. `firestore.rules` specifies:
     ```javascript
     match /recipes/{recipeId} {
       allow read: if true;
       allow create: if isAuthenticated() && request.resource.data.authorId == request.auth.uid;
       allow update, delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;
     }
     ```
  2. **Scenario A (Non-author blocked)**: User B leaves a review in `/recipes/{recipeId}/reviews/{reviewId}` and attempts to increment `reviewsCount` on `/recipes/{recipeId}`. Because User B is not the `authorId`, Firestore blocks the update (`PERMISSION_DENIED`).
  3. **Scenario B (Author spoofing)**: User A (author) updates their own recipe document, setting `averageRating: 5.0` and `likesCount: 1000000`. `firestore.rules` allows the write because `authorId == request.auth.uid`. No schema validation checks metric authenticity.
- **Blast Radius**: Recipe social integrity destroyed; non-authors cannot update recipe counters, while bad actors can fabricate social proof.
- **Mitigation**:
  - Use Firestore Cloud Functions (Firebase Triggers) to automatically recalculate and write aggregate ratings and like counters upon review/like events using Admin SDK privileges.
  - Prohibit direct client updates to `likesCount`, `reviewsCount`, `averageRating`, and `forksCount` in security rules using `request.resource.data.diff()`.

---

### [High] Challenge 4: Data Schema Discrepancy Between `RecipeDocument` (Phase 4.0) and `TMGC-v2` Compiler (Phase 5.0)

- **Assumption Challenged**: Section 3.5.1 assumes recipes stored in Phase 4.0 can be compiled directly into machine-executable `TMGC-v2` binary/JSON payloads for Thermomix hardware.
- **Attack / Failure Scenario**:
  1. `RecipeDocument` (Appendix B.1) defines steps as:
     ```typescript
     steps: Array<{
       stepNumber: number;
       instruction: string;
       thermomixSpeed?: number;
       thermomixTemp?: number;
       durationSeconds?: number;
     }>;
     ```
  2. `TMGCV2Payload` (Appendix B.2) requires:
     ```typescript
     attachment: 'NONE' | 'MEASURING_CUP' | 'BASKET' | 'VAROMA_DISH' | 'VAROMA_TRAY' | 'BUTTERFLY_WHISK';
     execution?: {
       speed: number;
       direction: 'FORWARD' | 'REVERSE';
       mode: 'NORMAL' | 'PULSE' | 'DOUGH_KNEAD' | 'TURBO';
       temperature: number;
       durationSeconds: number;
     };
     scale?: { tare: boolean; targetWeightGrams: number; toleranceGrams: number };
     ```
  3. When compiling a community recipe from Phase 4.0 into a `TMGC-v2` payload for Phase 5.0, mandatory parameters (`attachment`, `direction`, `mode`, `scale`) are missing.
- **Blast Radius**: Community recipes published in Phase 4.0 cannot be executed on physical Thermomix appliances without syntax errors or default value fallback assumptions.
- **Mitigation**: Update `RecipeDocument.steps` in Appendix B.1 to include optional `attachment`, `direction`, `mode`, and `scale` properties.

---

### [High] Challenge 5: Mechanical & Thermal Appliance Safety Enforcements Missing in Payload Execution

- **Assumption Challenged**: Section 1.3 Principle 4 guarantees "Hardware Safety First: Physical appliance control commands enforce strict thermal limits, blade motor torque protections...".
- **Attack / Failure Scenario**:
  1. Appendix B.2 allows execution parameters: `temperature: 120` and `speed: 10.0`.
  2. On physical Thermomix appliances (TM5/TM6/TM7), running blade speeds above `4.0` at temperatures exceeding `60°C` or in Varoma mode causes hot liquids to erupt from the bowl lid (severe thermal burn hazard).
  3. `ROADMAP.md` lacks strict payload validation logic in the `TMGC-v2` compiler or security bounds in schema.
- **Blast Radius**: Potential severe physical injuries to users or damage to Thermomix hardware when executing unvalidated payloads.
- **Mitigation**: Add mandatory compiler validation rules in Section 3.5:
  - If `temperature > 60°C`, `speed` MUST NOT exceed `4.0`.
  - `TURBO` mode MUST require `temperature == 0`.
  - `DOUGH_KNEAD` mode MUST require `temperature <= 37°C`.

---

### [Medium] Challenge 6: Script Architecture Conflict Between Baseline Script Tags and ES6 Modules

- **Assumption Challenged**: Section 4.3 and Appendix C introduce ES6 module feature flags (`export const FEATURE_FLAGS`) and modular JS files (`js/social.js`, `js/thermomix.js`).
- **Attack / Failure Scenario**:
  1. `index.html` currently loads scripts via standard non-module script tags: `<script src="js/app.js"></script>`.
  2. Importing or exporting ES6 modules in non-module scripts triggers a runtime browser error: `Uncaught SyntaxError: Cannot use import statement outside a module`.
- **Blast Radius**: Application fails to load in browser upon implementing Phase 2.0/4.0 modules.
- **Mitigation**: Update Appendix C to explicitly state that `index.html` must be updated to use `<script type="module" src="...">` or introduce a build step (Vite/ESBuild).

---

### [Medium] Challenge 7: Uncapped 30 FPS Edge Inference Causes Battery Drain & Thermal Throttling

- **Assumption Challenged**: Section 3.3.1 specifies continuous 30 FPS YOLOv8-nano tensor inference in WebWorker/WebGPU.
- **Attack / Failure Scenario**:
  1. Running full 416x416 WebGL/WebGPU tensor downsampling and forward passes at 30 FPS continuously on a mobile phone will maximize GPU usage.
  2. Mobile browsers will experience severe thermal throttling, frame drops, and battery depletion within 3–5 minutes.
- **Blast Radius**: Degraded mobile performance, UI lag, and device battery drain.
- **Mitigation**: Specify adaptive frame sampling in Section 3.3 (e.g. 5–10 FPS or motion-triggered inference when camera movement settles).

---

## Stress Test Results

| Scenario | Expected Behavior | Actual/Predicted Behavior | Pass/Fail |
|---|---|---|---|
| PWA initiates mTLS WebSocket to `wss://thermomix.local:8443` | Secure connection established | Browser throws `ERR_CERT_AUTHORITY_INVALID` & blocks mTLS | **FAIL** |
| User A views User B's Chef Profile via `/users/UserB` | User B profile displayed | Firestore security rule returns `PERMISSION_DENIED` | **FAIL** |
| User B submits review & updates recipe `likesCount` | Recipe likes incremented | Firestore denies non-author update to recipe document | **FAIL** |
| Author updates recipe with `averageRating: 5.0` & `likesCount: 999999` | Rejected or validated against reviews | Firestore permits author write without validation | **FAIL** |
| Phase 4.0 recipe compiled to Phase 5.0 `TMGC-v2` payload | Payload compiles with speed, temp, attachment, mode | Fails due to missing `attachment`, `direction`, `mode` in `RecipeDocument` | **FAIL** |
| Payload sent with `temp: 120°C` and `speed: 10.0` | Compiler rejects dangerous setting | Payload permits unsafe thermal/speed combination | **FAIL** |
| `js/app.js` imports `FEATURE_FLAGS` from `js/config.js` | Flags loaded | Browser throws `SyntaxError: Cannot use import statement outside a module` | **FAIL** |

---

## Unchallenged Areas

- **Phase 1.0 Baseline Architecture**: The current offline Single Page Application implementation (`index.html`, `js/app.js`, `js/recipes.js`, `js/scanner.js`) is clean, modular, and functional.
- **Gemini 1.5 Flash REST Integration**: Cloud fallback mechanisms for complex multi-ingredient parsing and recipe generation are well-designed and match existing baseline capabilities.
- **Phase 2.0 Offline Sync Concept**: Using IndexedDB cache alongside Firebase Firestore for local-first operations is architecturally sound (though schema/rule specifics require fixes identified above).
