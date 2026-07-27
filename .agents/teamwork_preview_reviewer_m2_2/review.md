# Quality & Adversarial Review Report: Milestone 2 — Strategic Evolution Roadmap & Architecture

**Document Under Review**: `ROADMAP.md` (v2.0.0-Master, 848 lines)  
**Reviewer Role**: Reviewer 2 (Objective Reviewer & Adversarial Critic)  
**Date**: 2026-07-27  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **HIGH**

---

## 1. Executive Verdict & Rationale

After a thorough technical inspection, diagram syntax analysis, security evaluation, schema review, and Markdown formatting audit of `ROADMAP.md`, the verdict is **REQUEST_CHANGES**.

While the document demonstrates excellent strategic vision, comprehensive scope, and clear phase transitions, it contains **Critical Security Vulnerabilities** in the Firestore Security Rules (`firestore.rules`), **Invalid API Syntax** in rules evaluation, **Client-Side Authorization Bypasses** in the social graph architecture, **Unverified Appliance Protocol Assumptions** regarding Thermomix TM6/TM7 hardware APIs, and **25 Markdown Formatting/TOC Anchor Defects**.

---

## 2. Review Findings

### 2.1 Critical Findings (Must Fix)

#### 🔴 Critical Finding 1: Firestore Security Rule Cascade Bypass & Invalid Method Syntax
- **Location**: `Appendix A: Complete Firestore Security Rules` (lines 694–698).
- **Code Snippet**:
  ```javascript
  // Line 694-695: Parent match rule
  match /users/{userId} {
    allow read, write: if isOwner(userId);
    
    // Line 697-699: Subcollection rule
    match /inventory/{ingredientId} {
      allow read, write: if isOwner(userId) && (request.method != 'create' || isValidIngredient(request.resource.data));
    }
  }
  ```
- **Why this is a problem**:
  1. **Rule Cascade Bypass**: In Cloud Firestore Security Rules, permissions evaluate as a logical OR across matching paths. Because `match /users/{userId}` allows `read, write` if `isOwner(userId)`, ALL subcollections (`inventory`, `custom_ingredients`, `bookmarks`, `meal_plans`, `devices`) inherit unconditional write access. The subcollection restriction `isValidIngredient(...)` is completely bypassed—any authenticated user can write invalid or malicious schemas directly to their inventory.
  2. **Invalid Syntax (`request.method`)**: Cloud Firestore Security Rules API does NOT contain a `request.method` property (`request.auth`, `request.resource`, `request.time`, and `request.path` exist). In Firestore rules, operation types are declared via match rules (`allow create:`, `allow update:`, `allow delete:`). Evaluating `request.method != 'create'` will cause a runtime evaluation error or undefined behavior in the Firestore security engine.
- **Suggested Fix**:
  Remove top-level `allow write` from `match /users/{userId}`. Define explicit permissions on specific subcollection match blocks using native operation types (`allow create: if isOwner(userId) && isValidIngredient(request.resource.data);`, `allow update, delete: if isOwner(userId);`).

---

#### 🔴 Critical Finding 2: Client-Side Fan-Out Security Rule Defeat in Recipe Social Network
- **Location**: `Section 3.4.3` (Sequence Diagram #7, line 440) vs `Appendix A` (`firestore.rules`, lines 694-696).
- **Code Snippet**:
  ```mermaid
  Graph->>Feed: Write Post ID to Follower Feeds
  Feed->>DB: Update /users/{followerId}/feed
  ```
- **Why this is a problem**:
  Diagram #7 depicts client/Social Graph Engine performing direct fan-out writes to `/users/{followerId}/feed`. Under the security rules in Appendix A (`allow read, write: if isOwner(userId)`), User A (creator) has NO write access to User B's (`followerId`) subcollection. Any attempt by a client to write directly to another user's feed subcollection will fail with `FirebaseError: Missing or insufficient permissions`.
- **Suggested Fix**:
  Clarify that fan-out feed updates and push notifications are executed by a trusted backend environment (Firebase Cloud Functions using the Firebase Admin SDK) listening to `onCreate` triggers on `/recipes/{recipeId}`, rather than client-driven calls.

---

#### 🔴 Critical Finding 3: Recipe Owner Transfer Vulnerability & Counter Update Lockout
- **Location**: `Appendix A` (`firestore.rules`, lines 719-729) & `Appendix B.1` (`RecipeDocument`).
- **Code Snippet**:
  ```javascript
  match /recipes/{recipeId} {
    allow read: if true;
    allow create: if isAuthenticated() && request.resource.data.authorId == request.auth.uid;
    allow update, delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;
  }
  ```
- **Why this is a problem**:
  1. **Owner Field Transfer**: `allow update` does not check `request.resource.data.authorId == resource.data.authorId`. An author can update a published recipe and change `authorId` to another user's UID, transferring or corrupting ownership.
  2. **Counter Lockout**: `RecipeDocument` stores `likesCount`, `reviewsCount`, and `averageRating`. When non-author users like or review a recipe, they cannot increment `likesCount` on `recipes/{recipeId}` under this rule because `resource.data.authorId == request.auth.uid` fails for non-authors.
- **Suggested Fix**:
  Enforce `request.resource.data.authorId == resource.data.authorId` on update. Implement dedicated Cloud Functions or transactional security rules for counter increments (`likesCount`, `reviewsCount`).

---

### 2.2 Major Findings (Should Fix)

#### 🟠 Major Finding 4: Unverified Thermomix Hardware Protocol & API Assumptions
- **Location**: `Section 3.5.1` & `Section 3.5.2` (Diagram #8 & #9).
- **Description**: The architecture claims direct physical appliance control of Thermomix TM6 and TM7 units via local mTLS WebSocket (`wss://thermomix.local:8443`) and BLE 5.0 for screen recipe injection and 5Hz real-time telemetry streaming (`Microcontroller --> BladeMotor`, `Microcontroller --> Heater`).
- **Why this is a problem**: Vorwerk Thermomix TM6/TM7 run a proprietary, closed OS. Vorwerk does NOT expose an open local WebSocket mTLS server or BLE 5.0 API for third-party direct motor/heater control or screen injection. Official Vorwerk Cookidoo API is a cloud-based calendar/recipe synchronization API. Presenting direct local WebSocket motor control as standard software integration without stating it requires custom hardware bridges (e.g. ESP32 hardware mod) is an unverified assumption.
- **Suggested Fix**: Reframe Phase 5.0 connectivity to distinguish between official Cookidoo Cloud API sync (cloud calendar/recipe import) and potential local hardware bridges or smart kitchen display companions.

---

#### 开启 Major Finding 5: Missing Thermal & Blade Speed Interlock Protections in TMGC-v2 Payload
- **Location**: `Section 1.3 (Principle 4)` vs `Appendix B.2` (`TMGCV2Payload Schema`).
- **Description**: Principle 4 requires physical thermal limits and motor torque protections. However, the `TMGCV2Payload` execution object in Appendix B.2 accepts raw parameters (`speed`: 0.0 to 10.0, `temperature`: 0 to 120°C) without safety validation rules or thermal speed locks.
- **Why this is a problem**: Operating a Thermomix blade at speed 10 with contents above 60°C presents a physical hot liquid spattering/scalding hazard. Thermomix hardware strictly limits speed when temperatures exceed 60°C. The schema must define safety interlock validation constraints.
- **Suggested Fix**: Add safety validation bounds to `TMGCV2Payload` (e.g. `maxSpeedAtTemp: { tempThreshold: 60, maxSpeed: 4.0 }`, `lidLockRequired: true`).

---

#### 🟠 Major Finding 6: TensorFlow.js WebGL Tensor Memory Leak Hazard in 30 FPS Loop
- **Location**: `Section 3.3.1` & `Section 3.3.2` (Edge Vision Engine).
- **Description**: Tier 1 Edge Inference runs quantized YOLOv8 at 30 FPS inside `InferenceWorker.js`.
- **Why this is a problem**: In TensorFlow.js, intermediate tensors created during frame downsampling, inference, and IoU NMS tracking are NOT garbage collected by JavaScript engine. They must be wrapped in `tf.tidy()` or explicitly freed via `tensor.dispose()`. Without memory hygiene guidelines, WebGL memory exhausts rapidly, causing browser context loss or worker crashes.
- **Suggested Fix**: Add memory management specification to Section 3.3 (`tf.tidy()` wrapping, tensor disposal protocol, GPU memory caps).

---

#### 🟠 Major Finding 7: Direct Client API Key Exposure Risk in Gemini REST Call
- **Location**: `Section 2.1` (Diagram #1) & `Section 3.3.2` (Diagram #4).
- **Description**: Diagram #1 and #4 show direct client browser HTTP POST requests (`UI_V1 -->|HTTP POST| GEMINI_V1`) to Google Gemini 1.5 Flash API.
- **Why this is a problem**: Calling Gemini directly from the client SPA requires embedding the API key in client JavaScript, exposing it to public extraction.
- **Suggested Fix**: Update diagrams and text to route Gemini requests through a Firebase Cloud Function proxy or secure token exchange gateway.

---

### 2.3 Minor Findings (Nice to Fix)

#### 🟡 Minor Finding 8: Missing TypeScript Schemas for User Profiles & Social Graph
- **Location**: `Section 3.4` & `Appendix B`.
- **Description**: Phase 4.0 references creator profiles (`@handle`, stats, bio), follower relationships, and user feeds. Appendix B provides `RecipeDocument` but omits `UserProfileDocument`, `SocialFollowerDocument`, and `ActivityStreamItem`.
- **Suggested Fix**: Provide complete TypeScript interface contracts for user profiles and social graph collections in Appendix B.

---

#### 🟡 Minor Finding 9: LWW Multi-Device Sync Partial Edit Data Loss
- **Location**: `Section 3.2.1`.
- **Description**: Phase 2.0 specifies scalar Last-Write-Wins (LWW) resolution for multi-device sync.
- **Why this is a problem**: If Device A updates item quantity while Device B updates item expiration date offline, document-level LWW overwrites the entire document, losing one device's field edits.
- **Suggested Fix**: Recommend field-level updates (`updateDoc`) or atomic array transforms (`arrayUnion`, `arrayRemove`).

---

#### 🟡 Minor Finding 10: 22 Broken Table of Contents Anchor Links
- **Location**: `Section 0 (Table of Contents)`, lines 10–46.
- **Description**: 22 TOC anchor links do not match GitHub Markdown heading anchor generation rules (e.g. `#21-high-level-architectural-evolution` vs `#21-high-level-architectural-evolution-mermaid-master-diagram`, `#31-phase-10-current-baseline-offline-spa--thermomix-assistant` vs `#31-phase-10-current-baseline-offline-spa-thermomix-assistant`).
- **Suggested Fix**: Update TOC anchor URLs to match exact heading anchors.

---

#### 🟡 Minor Finding 11: Untagged ASCII Code Blocks
- **Location**: Lines 150, 561, 640.
- **Description**: Code blocks at lines 150 (System Topology), 561 (Rollout Schedule), and 640 (Testing Pyramid) lack language tags (`` ``` `` instead of `` ```text ``).
- **Suggested Fix**: Add `text` language tags to code blocks.

---

## 3. Verified Claims & Diagram Syntax Matrix

| Item / Claim | Verification Method | Status | Notes |
|---|---|---|---|
| Mermaid Diagram #1 Syntax | Custom Parser & Token Inspection | **PASS** | Valid flowchart syntax, clear layer grouping. |
| Mermaid Diagram #2 Syntax | Custom Parser & Token Inspection | **PASS** | Valid flowchart syntax, nested subgraphs valid. |
| Mermaid Diagram #3 Syntax | Custom Parser & Token Inspection | **PASS** | Valid sequence diagram syntax. |
| Mermaid Diagram #4 Syntax | Custom Parser & Token Inspection | **PASS** | Valid flowchart syntax, dotted links valid. |
| Mermaid Diagram #5 Syntax | Custom Parser & Token Inspection | **PASS** | Valid sequence diagram syntax. |
| Mermaid Diagram #6 Syntax | Custom Parser & Token Inspection | **PASS** | Valid flowchart syntax. |
| Mermaid Diagram #7 Syntax | Custom Parser & Token Inspection | **PASS** | Valid sequence diagram (`alt`/`par` blocks valid). |
| Mermaid Diagram #8 Syntax | Custom Parser & Token Inspection | **PASS** | Valid flowchart syntax. |
| Mermaid Diagram #9 Syntax | Custom Parser & Token Inspection | **PASS** | Valid sequence diagram (`opt`/`loop`/`alt` valid). |
| Firestore Rules Security | Static Security Rule Analysis | **FAIL** | Critical parent rule bypass & invalid `request.method`. |
| Social Feed Fan-Out Security | Data Flow vs Security Rules Trace | **FAIL** | Client fan-out violates `isOwner` rule. |
| Table of Contents Anchors | Automated Link Validation Script | **FAIL** | 22 anchor links broken. |
| Code Block Tagging | Automated Code Block Scanner | **FAIL** | 3 code blocks untagged. |

---

## 4. Adversarial Stress-Test Scenarios

1. **Scenario A: Malicious Inventory Injection**
   - *Attack*: Authenticated user submits an inventory create request containing malicious script tags or negative quantities.
   - *Result*: Parent rule `match /users/{userId}` allows write immediately. `isValidIngredient` check in subcollection rule is bypassed. **VULNERABLE**.

2. **Scenario B: Unauthorized Recipe Takeover**
   - *Attack*: User A edits their recipe and changes `authorId` to User B's UID.
   - *Result*: Firestore rule allows update because current document has `resource.data.authorId == request.auth.uid`. Recipe is transferred to User B. **VULNERABLE**.

3. **Scenario C: Social Feed Fan-Out Crash**
   - *Attack*: Creator with 1,000 followers publishes a recipe; client app attempts to write to `/users/{followerId}/feed` for each follower.
   - *Result*: All 1,000 writes fail with 403 Forbidden due to security rules. Feed remains empty. **FAILED FLOW**.

4. **Scenario D: Thermal Scalding Hazard**
   - *Attack*: Recipe payload specifies step 1: `temperature: 100°C`, `speed: 10.0`.
   - *Result*: Payload executes on appliance without speed limit validation, causing boiling liquid spatter. **SAFETY HAZARD**.

---

## 5. Required Action Plan for Author

1. **Refactor `firestore.rules` (Appendix A)**:
   - Remove top-level `allow write` from `/users/{userId}`.
   - Replace `request.method != 'create'` with explicit `allow create`, `allow update`, `allow delete` rules.
   - Add `request.resource.data.authorId == resource.data.authorId` to recipe update rule.
   - Add secure counter update logic / Cloud Functions.
2. **Correct Social Feed Data Flow**:
   - Update Sequence Diagram #7 to show Cloud Functions handling fan-out feed writes.
3. **Clarify Appliance Integration & Safety Rules**:
   - Differentiate official Cookidoo Cloud API from custom hardware WebSocket control.
   - Add speed/temperature thermal interlocks to `TMGCV2Payload`.
4. **Add TensorFlow.js Memory Protocol**:
   - Specify `tf.tidy()` and tensor disposal rules in Section 3.3.
5. **Fix Markdown & TOC Links**:
   - Fix 22 TOC anchor links.
   - Tag 3 ASCII code blocks with `text`.
