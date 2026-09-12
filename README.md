# opencode-holygrail — Holy Grail Engineering Harness

**Self-correcting autonomous engineering harness** for web apps. Enforces the 4-phase `AGENTS.md` pipeline (Discovery → Frontend Design → Verification → Debug) with safety circuit breakers and 10/10 quality gates.

Repo: https://github.com/1rishLatte/THE-HOLY-GRAIL

---

## ⚡ Easy Install (avg-user path — 1 command)

### ⭐ One-shot setup (no manual JSON)
```sh
npx holy-grail-init setup ./my-app
# does: scaffold AGENTS.md + src/docs/.scratch + writes opencode.json plugin entry
cd my-app
npm i opencode-holygrail   # if not already
npx opencode               # agent starts Phase 1 discovery automatically (4 questions, one-at-a-time)
```

That's it — no `opencode.json` editing needed. For an empty folder:
```sh
mkdir my-holy-app && cd my-holy-app && npx holy-grail-init setup . && npm i opencode-holygrail && npx opencode
```

### Option A — As OpenCode Plugin (manual)
```sh
npm i opencode-holygrail
```
Then add to `opencode.json` (create if missing):
```json
{
  "plugin": ["opencode-holygrail"]
}
```
Local dev:
```json
{
  "plugin": ["file:C:/Users/aadar/opencode-HolyGrail"]
}
```
Restart `opencode` — tools `holy_grail_setup`, `holy_grail_discovery`, `holy_grail_init`, `holy_grail_status`, `holy_grail_verify`, `holy_grail_design_audit`, `holy_grail_debug` appear; full `AGENTS.md` harness is injected as enforced system prompt (hard guard denies `src/` writes during Phase 1).

Verify:
```sh
npx opencode --help  # or check TUI plugin list
```

### Option B — As CLI (`holy-grail-init`)
No OpenCode required:
```sh
npx holy-grail-init setup ./my-app    # avg-user one-shot
npx holy-grail-init init ./my-app     # scaffold only
holy-grail-init status --path ./my-app
holy-grail-init verify --path ./my-app --url http://localhost:3000
```
Works with `npm`, `pnpm`, `bun`:
```sh
pnpm dlx holy-grail-init setup .
bunx holy-grail-init setup .
```

---

## What `init` Does

Creates per `AGENTS.md §1` (folder hygiene):

```
my-app/
├── AGENTS.md                     # master harness (copied)
├── src/
│   ├── components/               # Nav, Chatbot — production only
│   ├── pages/                    # route views
│   └── styles/                   # tokens, Tailwind
├── docs/
│   ├── site-structure.md         # routes + layout hierarchy
│   ├── design-system.md          # palette, typography, tokens
│   └── architecture.md           # stack, APIs, NFR budgets
└── .scratch/
    ├── plan.md                   # execution memory
    └── design-refinement.log     # self-correction log (breaker 5)
```

`src/` is **locked during Phase 1** — no writes until 3 docs are approved.

---

## 4-Phase Execution Model

```
Regular feature → Phase 1 Discovery → Phase 2 Frontend Design (≤5 retries) → Phase 3 Execution + 10/10 Gate → Phase 4 Debug
Bug / /debug   → bypass 1 & 2 → Phase 3 → Phase 4 (reconciliation)
```

### Phase 1 — Discovery (one question at a time — hard-guarded)
Agent calls `holy_grail_discovery step 1..4` sequentially: 1) Core Feature Objective → `.scratch/plan.md` 2) Routing → `docs/site-structure.md` 3) Design System → `docs/design-system.md` 4) Stack/NFR → `docs/architecture.md`. **Hard guard:** `permission.ask` + `tool.execute.before` **DENY** any `src/` write while gate is FAIL (visible `HARD GUARD DENY` log to `.scratch/design-refinement.log`). Exit gate: `holy_grail_status` PASS before Phase 2.

### Phase 2 — Self-Correcting Frontend (`src/components`, `src/styles`) — visible loop
- Sticky nav: `position: fixed; top:0; left:0; right:0; z-index:1000; height:var(--nav-height)`
- Guards: `padding-top: calc(var(--nav-height) + 24px); padding-bottom:96px`
- Chatbot: `position: fixed; bottom:24px; right:24px; z-index:2000` (FAB ↔ expanded with `-` minimize)
- Audit via `holy_grail_design_audit` → logs `RETRY_COUNT n/5` to `.scratch/design-refinement.log` → increment with `incrementRetry: true` → on 5th failure **HALT** and dump log (avg user sees `RETRY_COUNT 3/5` live)

### Phase 3 — 10/10 Verification (must pass before "done") — real headless runner
```sh
holy_grail_verify                # via OpenCode (real Lighthouse + real Playwright overflow)
holy-grail-init verify --path . --url http://localhost:3000
# Lighthouse: Perf ≥90, A11y =100, Best Practices =100, SEO ≥90 (real JSON scores when lighthouse present)
# Anti-overflow REAL: Playwright chromium headless checks scrollWidth===innerWidth at 375, 768, 1440 (PASS ✓ per viewport)
#   Install once for real overflow: npm i -D playwright && npx playwright install chromium
#   If not installed or URL not reachable, falls back to heuristic (grep 100vw) + instruction
# Logs to .scratch/plan.md automatically
```
- Tested: clean page `375 PASS ✓, 768 PASS ✓, 1440 PASS ✓`; 100vw overflow page `385 vs 375 FAIL ✗` correctly at all viewports.
Failures → fix `src/`, re-run `holy_grail_verify`.

### Phase 4 — Fast-Path Debug
`/debug` or stack trace → failing test in `src/` → surgical fix → regression suite → `git diff` → update `docs/site-structure.md` / `docs/architecture.md` → entry in `.scratch/plan.md`.

---

## OpenCode Tools Exposed

| Tool | Phase | Purpose |
|------|-------|---------|
| `holy_grail_setup` | 0 | **Avg-user one-shot:** scaffold + write `opencode.json` (no manual edit) |
| `holy_grail_discovery` | 1 | **Guided 4-step:** `step 1..4` one question at a time → writes `docs/*.md` |
| `holy_grail_init` | 1 | Scaffold `AGENTS.md` + `src/docs/.scratch` (low-level) |
| `holy_grail_status` | 1 gate | Check 3 docs + hygiene PASS/FAIL (hard guard reference) |
| `holy_grail_design_audit` | 2 | Real audit + `RETRY_COUNT n/5` visible in `.scratch/design-refinement.log` |
| `holy_grail_verify` | 3 | **Real headless:** Lighthouse JSON + Playwright 375/768/1440 `scrollWidth===innerWidth` + `.scratch/plan.md` |
| `holy_grail_debug` | 4 | Fast-path + `git diff --stat` + reconciliation hint |
| `holy_grail_run` | compat | Alias → prefer `verify`/`debug` |

System prompt is auto-augmented with the full harness + **hard guards** (`permission.ask`/`tool.execute.before` DENY `src/` during Phase 1) and visible `RETRY_COUNT` — avg user sees enforcement, not just suggestion.

---

## Development

```sh
cd opencode-HolyGrail
npm i
npm run build        # tsup + tsc declarations → dist/
npm run typecheck
npm pack --dry-run   # verify shipped files: dist, bin, AGENTS.md, assets, README, LICENSE
```

`agENTs.md` is the source of truth — templates live in `assets/templates/` and are copied by `bin/index.js`.

---

## Publishing

```sh
npm version patch   # or minor/major
npm publish --access public
git push --follow-tags
```

Requires `node >=18`, `@opencode-ai/plugin ^1.18.30`.

License: MIT © 1rishLatte — see `LICENSE`.
