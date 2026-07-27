# Handoff Report: Milestone 2 Adversarial Review (Challenger 2)

## 1. Observation

Direct observations from codebase inspection of `ROADMAP.md`, `index.html`, `js/app.js`, `js/recipes.js`, `js/scanner.js`, `package.json`, and `.env`:

1. **Browser WebSocket API & mTLS Specs (`ROADMAP.md` line 456 & 500)**:
   - Line 456: `wss://thermomix.local:8443`
   - Line 455: `Bluetooth Low Energy (BLE 5.0) discovery and mutual TLS (mTLS) WebSocket session (wss://thermomix.local:8443) over Wi-Fi.`
   - Codebase inspection: Browser W3C `WebSocket` interface (`new WebSocket(url)`) accepts no client certificate parameters for mTLS. Standard browser security rejects self-signed local TLS certificates with `ERR_CERT_AUTHORITY_INVALID`.

2. **Firestore Security Rules User Profile Isolation (`ROADMAP.md` lines 694–695)**:
   - Line 694: `match /users/{userId} {`
   - Line 695: `  allow read, write: if isOwner(userId);`
   - Line 679: `function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }`
   - Result: User A reading `/users/UserB` is rejected by Firestore with `PERMISSION_DENIED`. No rules defined for `/users/{userId}/feed`, `/followers`, or social graph.

3. **Firestore Security Rules Recipe Updates (`ROADMAP.md` lines 719–723)**:
   - Line 721: `allow create: if isAuthenticated() && request.resource.data.authorId == request.auth.uid;`
   - Line 722: `allow update, delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;`
   - Result: Non-authors are blocked from updating aggregate metrics on `/recipes/{recipeId}`. Authors can set `averageRating: 5.0` or `likesCount: 999999` without validation.

4. **Schema Lineage Gap in `RecipeDocument` vs `TMGCV2Payload` (`ROADMAP.md` lines 772–778 vs lines 794–811)**:
   - Appendix B.1 `RecipeDocument.steps`: Contains only `stepNumber`, `instruction`, `thermomixSpeed?`, `thermomixTemp?`, `durationSeconds?`.
   - Appendix B.2 `TMGCV2Payload.steps`: Requires `attachment`, `execution.direction`, `execution.mode`, and `scale`.
   - Result: Phase 4.0 recipes lack fields required for Phase 5.0 `TMGC-v2` compilation.

5. **HTML Script Loading vs ES6 Modules (`index.html` lines 680–682 vs `ROADMAP.md` line 590)**:
   - `index.html`: `<script src="js/recipes.js"></script><script src="js/scanner.js"></script><script src="js/app.js"></script>`
   - `ROADMAP.md` line 590: `export const FEATURE_FLAGS = { ... };`
   - Result: ES6 `export`/`import` statements in non-module script tags cause `Uncaught SyntaxError`.

---

## 2. Logic Chain

1. **Phase 5.0 IoT Connection Failure**:
   - *Observation 1* shows `ROADMAP.md` specifies browser PWA mTLS WebSockets to `wss://thermomix.local:8443`.
   - Standard browser Web APIs do not expose client certificate configuration for `WebSocket()` constructor.
   - Therefore, direct browser-to-appliance mTLS WebSocket connections will fail in standard web browsers.

2. **Phase 4.0 Social Feature Breakdown**:
   - *Observation 2* shows `/users/{userId}` allows read only if `request.auth.uid == userId`.
   - Viewing another user's Chef Profile requires reading `/users/{otherUserId}`.
   - Therefore, social features (Chef Profiles, Followers) will fail with `PERMISSION_DENIED`.

3. **Rating Spoofing Vulnerability**:
   - *Observation 3* shows `firestore.rules` allows `update` on `/recipes/{recipeId}` only if `authorId == request.auth.uid`.
   - Non-authors cannot update recipe counters when liking/reviewing.
   - Authors can update any field on their recipe without validation.
   - Therefore, ratings can be spoofed by authors while legitimate review updates by non-authors are blocked.

4. **Schema Compilation Lineage Failure**:
   - *Observation 4* shows `RecipeDocument.steps` lacks `attachment`, `direction`, `mode`, and `scale`.
   - `TMGCV2Payload` requires these execution parameters.
   - Therefore, compiling a Phase 4.0 `RecipeDocument` into a Phase 5.0 `TMGCV2Payload` will result in undefined/missing appliance execution settings.

5. **Runtime Script Syntax Error**:
   - *Observation 5* shows `index.html` loads classic `<script>` tags, while `ROADMAP.md` specifies ES6 `export const FEATURE_FLAGS`.
   - Browsers reject `import`/`export` in classic scripts with `SyntaxError`.
   - Therefore, attempting to import feature flags directly will break browser runtime loading unless `<script type="module">` is added.

---

## 3. Caveats

- **External Cloud Appliance Gateways**: If Vorwerk/Thermomix provides a cloud-based WebSocket proxy API rather than direct local LAN mTLS, browser PWA constraints on mTLS can be bypassed.
- **Firebase Cloud Functions**: If all social metrics, feed fan-out, and profile reads are routed through Firebase Cloud Functions (Admin SDK), Firestore Security Rules limitations for client writes can be mitigated on the server side.

---

## 4. Conclusion

`ROADMAP.md` is an excellent baseline for Leftover Chef's multi-phase evolution, but contains **critical technical and security flaws in Phase 4.0 and Phase 5.0** that must be resolved before implementation:
1. Browser mTLS WebSocket limitations require a local relay or cloud gateway architecture.
2. Firestore security rules must be updated with public profile collections and server-side Cloud Function triggers for recipe ratings and feeds.
3. `RecipeDocument` schema must be expanded to include all `TMGC-v2` appliance parameters (`attachment`, `direction`, `mode`).
4. Script tag loading in `index.html` must be updated to ES6 modules (`type="module"`).
5. Thermal and blade speed safety checks must be explicitly enforced in `TMGC-v2` execution compiler specs.

---

## 5. Verification Method

1. **Verify Security Rules**:
   - Inspect `ROADMAP.md` lines 694–695 and test with Firebase Rules Emulator: `firebase emulators:start --only firestore`.
   - Attempt a read from User A to `/users/UserB`; verify it returns `PERMISSION_DENIED`.

2. **Verify Schema Compilation**:
   - Compare `RecipeDocument` (Appendix B.1) with `TMGCV2Payload` (Appendix B.2).
   - Confirm missing fields: `attachment`, `direction`, `mode`, `scale`.

3. **Verify Script Module Tag**:
   - Open `index.html` line 680–682. Confirm `<script src="js/app.js">` lacks `type="module"`.
