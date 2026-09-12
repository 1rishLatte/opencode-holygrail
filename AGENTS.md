# AGENTS.md — The Holy Grail Engineering Harness

This file serves as the master autonomous engineering harness for **The Holy Grail**. It defines folder separation rules, execution pipelines, safety circuit breakers, automated 10/10 quality gates, and post-fix sync operations across all project tasks.

---

## 1. Directory Structure & Folder Hygiene Rules

To prevent confusion between system specs, working memory, and production code in **The Holy Grail**, all file modifications MUST strictly adhere to these three root directories:

```
├── src/                        <-- PRODUCTION SOURCE CODE ONLY
│   ├── components/             │   (Persistent Nav, Chatbot, UI modules)
│   ├── pages/                  │   (Route views, page layouts, frameworks)
│   └── styles/                 │   (CSS Variables, design tokens, Tailwind)
│
├── docs/                       <-- SYSTEM SPECIFICATIONS & CONTRACTS
│   ├── site-structure.md       │   (Route map, layout hierarchy, navigation)
│   ├── design-system.md        │   (Color palettes, typography, spacing tokens)
│   └── architecture.md         │   (Tech stack choices, APIs, NFR budgets)
│
└── .scratch/                   <-- AGENT MEMORY & EXECUTION LOGS
    ├── plan.md                 │   (Active task checklists & execution history)
    └── design-refinement.log   │   (Self-correction logs & retry counters)
```

### Directives:
* **`src/` Lockout:** No file inside `src/` may be created or modified during **Phase 1 (Discovery)**.
* **Disposable Code Prohibition:** Do NOT create standalone or temporary preview HTML files in `docs/` or root. All component code must be written directly into `src/`.
* **Single Source of Truth:** `docs/` holds specs; `src/` holds real code; `.scratch/` holds execution state.

---

## 2. Safety Caps & Automated Quality Gates

* **Phase 2 Self-Correction Circuit Breaker (Max 5 Retries):**
  When auto-correcting visual alignment, component mismatches, or layout collisions in `src/`, the agent is capped at **5 retry attempts**. If defects remain after 5 iterations, HALT execution, log error details in `.scratch/design-refinement.log`, and request user guidance in chat.

* **Phase 3 Automated 10/10 Quality Gate:**
  Before marking any feature in **The Holy Grail** as complete, the agent must run automated headless CLI verification against local builds:
  1. **Lighthouse / Performance Scan:** Performance >= 90, Accessibility (WCAG AA) = 100, Best Practices = 100, SEO >= 90.
  2. **Viewport Anti-Overflow Check:** Verify `document.documentElement.scrollWidth === window.innerWidth` across mobile (`375px`), tablet (`768px`), and desktop (`1440px`) viewports (zero horizontal scrolling on mobile).

* **Phase 4 Post-Fix Documentation Reconciliation:**
  Fast-path hotfixes bypass Phase 1 and 2 for speed, but MUST run an automated 1-step reconciliation upon resolution to update `docs/site-structure.md` or `docs/architecture.md` to prevent documentation drift.

---

## 3. Global Route Selection

```
                            USER PROMPT RECEIVED
                                     │
               ┌─────────────────────┴─────────────────────┐
               │                                           │
   [Regular Feature Request]                   [Bug Report / /debug / /hotfix]
               │                                           │
               ▼                                           ▼
     PHASE 1: DISCOVERY                          FAST-PATH BYPASS
    (Routing, Tokens, NFRs)                     (Skip Phase 1 & Phase 2)
               │                                           │
               ▼                                           │
   PHASE 2: FRONTEND DESIGN                                │
  (Self-Correction Loop, Max 5 Retries)                    │
               │                                           │
               ▼                                           │
PHASE 3: EXECUTION & VERIFICATION ◄────────────────────────┘
 (TDD + 10/10 Automated Quality Gate)
               │
               ▼
 PHASE 4: EVIDENCE-BASED DEBUGGING
 (Surgical Fix + Post-Fix Docs Sync)
```

## 4. Complete Execution Phase Skills

### --- PHASE 1: BALANCED DISCOVERY ENGINE ---

#### Trigger & Scope:
Runs at session start or when defining new features for **The Holy Grail**. Strictly forbids writing to `src/`.

#### Interrogation Procedure (One Question at a Time):
1. **Core Feature Objective:** What is the application's primary goal and required functional capabilities (auth, dynamic data, interactive forms)?
2. **Routing & Hierarchy:** What is the route structure (`/`, `/about`, `/services`) and shared layout hierarchy (header, footer, sidebars)?
   * *Write to:* `docs/site-structure.md`
3. **Design System & Tokens:** What is the visual aesthetic direction (e.g., Glassmorphism, Dark Cyberpunk, Modern Minimalist), primary colors, and font preferences?
   * *Write to:* `docs/design-system.md`
4. **Tech Stack & NFR Budgets:** What framework (React, Astro, Next.js, Tailwind), third-party APIs (Formspree, Supabase), and Non-Functional Requirement (NFR) budgets (Lighthouse >= 90, mobile viewport constraints) apply?
   * *Write to:* `docs/architecture.md`

#### Exit Gate:
`docs/site-structure.md`, `docs/design-system.md`, and `docs/architecture.md` must be written and approved before transitioning to Phase 2.

---

### --- PHASE 2: SELF-CORRECTING FRONTEND DESIGN ENGINE ---

#### Trigger & Scope:
Runs after Phase 1 exit. Writes production components directly to `src/components/` and `src/styles/`.

#### Layout & Component Specifications:
* **Sticky Top Navigation:** `position: fixed; top: 0; left: 0; right: 0; z-index: 1000; height: var(--nav-height);`.
* **Content View Clearances:** Top padding guard (`padding-top: calc(var(--nav-height) + 24px);`) to prevent nav clipping; bottom clearance guard (`padding-bottom: 96px;`) for floating widgets.
* **Stateful Floating Chatbot (Optional):** Positioned bottom-right (`position: fixed; bottom: 24px; right: 24px; z-index: 2000;`). Includes state toggle between **FAB Icon (Minimized)** and **Expanded Window** (with working `-` minimize button).

#### Self-Correction Protocol (Circuit Breaker = 5):
1. **Generate Code:** Write layout and components into `src/`.
2. **Audit Alignment:** Verify contrast, font scale, top clearance, 24px widget gutters, and layout shifts during minimize state toggles.
3. **Auto-Correct Loop:** If defects exist, set `RETRY_COUNT = 0`.
   * Log defect to `.scratch/design-refinement.log`.
   * Re-write component code in `src/`.
   * Increment `RETRY_COUNT += 1`.
   * Re-audit visual layout.
4. **Circuit Breaker Halt:** If `RETRY_COUNT == 5` and defects persist:
   * **HALT Execution.** Output diagnostic breakdown from `.scratch/design-refinement.log` to chat.
   * Prompt user for manual direction or constraint override.

---

### --- PHASE 3: EXECUTION & 10/10 VERIFICATION ENGINE ---

#### Trigger & Scope:
Executes feature logic in `src/` following Phase 2 approval.

#### Execution Loop:
1. Build page views, state handlers, and API client integrations in `src/`.
2. Execute Test-Driven Development (TDD) for business logic and state functions.

#### Mandatory 10/10 Quality Gate Audit:
Before marking any task as complete in **The Holy Grail**, execute automated CLI checks:
* **Lighthouse Performance Scan:**
  * Performance: >= 90
  * Accessibility (WCAG AA): = 100
  * Best Practices: = 100
  * SEO: >= 90
* **Responsive Anti-Overflow Scan:**
  * Verify `document.documentElement.scrollWidth === window.innerWidth` across `375px`, `768px`, and `1440px` viewports.
* *Failure Action:* If any check fails, log details in `.scratch/plan.md`, apply fixes in `src/`, and re-run the audit.

---

### --- PHASE 4: FAST-PATH DEBUGGING & DOCS RECONCILIATION ---

#### Triggers:
Activated by `/debug`, `/hotfix`, error traces, or failing tests. Bypasses Phase 1 and 2 governance for immediate action in `src/`.

#### Fast-Path Workflow:
1. **Sleuth & Reproduce:** Create a failing automated test in `src/` reproducing the exact stack trace or bug report.
2. **Surgical Fix:** Write the minimal production fix in `src/` required to pass the test.
3. **Regression Check:** Run test suite to verify no adjacent functionality was altered.

#### Post-Fix Documentation Reconciliation:
1. Inspect `git diff` of the resolved bug fix.
2. If routes, API contracts, layout offsets, or component signatures were modified:
   * Update `docs/site-structure.md` (for route/layout changes).
   * Update `docs/architecture.md` (for API, state, or NFR changes).
3. Record completion in `.scratch/plan.md`:
   > *"Hotfix [Bug Summary] resolved in src/. Synchronized changes to docs/architecture.md."*
