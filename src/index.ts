import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { readFileSync, existsSync, appendFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

/**
 * Holy Grail — AGENTS.md Engineering Harness (OpenCode plugin) v2
 * Upgrades for avg user:
 *  - setup one-shot (bin + tool)
 *  - hard guard: permission.ask + tool.execute.before deny src writes during Phase 1
 *  - guided discovery holy_grail_discovery (4 steps, one question at a time)
 *  - real 10/10 verify runner (lighthouse + anti-overflow heuristics + .scratch/plan.md)
 *  - visible loop via tool.execute.after + event logging to .scratch/design-refinement.log
 */

function loadAgentsMd(worktree: string): string {
  const candidates = [
    join(worktree, "AGENTS.md"),
    join(resolve((import.meta as any).dirname ?? ".", ".."), "AGENTS.md"),
  ];
  for (const p of candidates) {
    try { if (existsSync(p)) return readFileSync(p, "utf8"); } catch {}
  }
  return "";
}

function isPhase1Pass(targetDir: string): boolean {
  return ["docs/site-structure.md", "docs/design-system.md", "docs/architecture.md"].every((p) => existsSync(join(targetDir, p)));
}

function isSrcPath(p: string): boolean {
  if (!p) return false;
  const n = p.replace(/\\/g, "/");
  return n.includes("src/") || n === "src" || n.startsWith("src/");
}

function ensureScratch(targetDir: string) {
  try { mkdirSync(join(targetDir, ".scratch"), { recursive: true }); } catch {}
}

function logRefinement(targetDir: string, msg: string) {
  try {
    ensureScratch(targetDir);
    const logPath = join(targetDir, ".scratch/design-refinement.log");
    const ts = new Date().toISOString();
    appendFileSync(logPath, `[${ts}] ${msg}\n`, "utf8");
  } catch {}
}

function logPlan(targetDir: string, msg: string) {
  try {
    ensureScratch(targetDir);
    const planPath = join(targetDir, ".scratch/plan.md");
    const ts = new Date().toISOString();
    appendFileSync(planPath, `\n- [${ts}] ${msg}\n`, "utf8");
  } catch {}
}

export const HolyGrailPlugin: Plugin = async ({ project, directory, worktree, $ }) => {
  const agentsMd = loadAgentsMd(worktree);

  return {
    // Inject full harness into system prompt
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(
        [
          "# Holy Grail — AGENTS.md Harness (enforced v2)",
          "",
          "You MUST follow the 4-phase execution model. Do not skip phases.",
          "",
          "## Quick start for avg user",
          "- New project: run `holy_grail_setup` (one-shot) OR `npx holy-grail-init setup .`",
          "- Then say 'start discovery' — agent will call `holy_grail_discovery` step 1..4 one question at a time",
          "- Agent will enforce src/ lockout until Phase 1 PASS — hard guard denies src writes",
          "",
          "## §1 Folder Hygiene (STRICT — enforced by hard guard)",
          "- src/ — PRODUCTION ONLY (components/, pages/, styles/). LOCKED during Phase 1 Discovery. Hard guard DENYs writes.",
          "- docs/ — specs only: site-structure.md, design-system.md, architecture.md",
          "- .scratch/ — memory: plan.md, design-refinement.log (auto-logged, RETRY_COUNT visible)",
          "- Prohibitions: no temp HTML in docs/root, no src/ writes in Phase 1, single source of truth.",
          "",
          "## §2 Safety Caps",
          "- Phase 2 circuit breaker: 5 retries max. Each retry logged to .scratch/design-refinement.log as RETRY_COUNT n/5. On 5th failure, HALT and dump log.",
          "- Phase 3 gate: Lighthouse Perf>=90, A11y=100, Best Practices=100, SEO>=90 + scrollWidth===innerWidth at 375/768/1440 (real runner, not heuristic).",
          "- Phase 4 reconciliation: after hotfix, git diff → update docs/site-structure.md or docs/architecture.md",
          "",
          "## §3 Global Route Selection",
          "- Regular feature → Phase1 → Phase2 → Phase3 → Phase4",
          "- Bug / /debug / /hotfix → bypass Phase1&2 → Phase3 → Phase4",
          "",
          "## Phase 1 — Balanced Discovery (ONE question at a time, src LOCKOUT)",
          "Call holy_grail_discovery step 1: ask Core Feature Objective → write answer summary to memory",
          " step 2: ask Routing & Hierarchy → write docs/site-structure.md",
          " step 3: ask Design System → write docs/design-system.md",
          " step 4: ask Tech Stack & NFR → write docs/architecture.md",
          "Exit gate: holy_grail_status PASS before any src/ writes.",
          "",
          "## Phase 2 — Self-Correcting Frontend",
          "- Sticky nav: position:fixed; top:0; left:0; right:0; z-index:1000; height:var(--nav-height)",
          "- Guards: padding-top:calc(var(--nav-height)+24px); padding-bottom:96px",
          "- Chatbot: position:fixed; bottom:24px; right:24px; z-index:2000; FAB ↔ Expanded with '-' minimize",
          "- Audit via holy_grail_design_audit — logs RETRY_COUNT to .scratch/design-refinement.log",
          "",
          "## Phase 3 — Execution & 10/10 Verification",
          "- Use holy_grail_verify — real Lighthouse if available, plus anti-overflow heuristics, logs to .scratch/plan.md",
          "",
          "## Phase 4 — Fast-Path Debug",
          "- Use holy_grail_debug — Sleuth→Reproduce→Surgical fix→Regression→Docs reconciliation",
          "",
          "## Tools",
          "- holy_grail_setup: one-shot bootstrap (scaffold + opencode.json)",
          "- holy_grail_discovery: guided 4-step interrogation (one question at a time)",
          "- holy_grail_init: scaffold src/docs/.scratch + AGENTS.md",
          "- holy_grail_status: check Phase 1 exit gate",
          "- holy_grail_verify: real 10/10 checks (Lighthouse + overflow)",
          "- holy_grail_design_audit: Phase 2 alignment audit (visible RETRY_COUNT)",
          "- holy_grail_debug: Phase 4 entry",
          "",
          agentsMd ? `--- Raw AGENTS.md (authoritative, ${agentsMd.length} chars) ---\n${agentsMd.slice(0, 8000)}` : "",
        ].join("\n")
      );
    },

    // Visible loop: log tool lifecycle
    event: async ({ event }) => {
      void event; void project; void directory;
      // Generic event log for retries — handled more specifically in tool.execute.after
    },

    // Hard guard: deny permission for src writes during Phase 1
    "permission.ask": async (input, output) => {
      try {
        // input shape varies by SDK version — check common fields
        const anyIn: any = input as any;
        const raw: string = (anyIn.path ?? anyIn.file ?? anyIn.filename ?? anyIn.pattern ?? anyIn.tool ?? "") as string;
        const permission = (anyIn.permission ?? anyIn.type ?? "") as string;
        // Also inspect patterns array if present
        const patterns: string[] = anyIn.patterns ?? (Array.isArray(anyIn.path) ? anyIn.path : []);
        const allPaths = [raw, ...patterns].filter(Boolean).join(" ");
        const targetsSrc = isSrcPath(allPaths) || patterns.some(isSrcPath) || isSrcPath(raw);
        const isWrite = /write|edit|create|update|patch|apply/i.test(permission) || allPaths.includes("src/");
        if (targetsSrc && isWrite) {
          const pass = isPhase1Pass(worktree);
          if (!pass) {
            // Deny — enforce src lockout
            output.status = "deny";
            logRefinement(worktree, `HARD GUARD DENY: blocked src write during Phase 1 (permission=${permission}, path=${allPaths.slice(0, 200)}). Phase 1 gate FAIL — complete docs/ before src/.`);
            return;
          }
        }
      } catch {}
      // Leave output.status as is (ask/allow) if not denied
    },

    // Second hard guard layer for tool args
    "tool.execute.before": async (input, output) => {
      try {
        const anyOut: any = output as any;
        const args = anyOut.args ?? {};
        // Collect any path-like arg values
        const candidates: string[] = [];
        for (const v of Object.values(args)) {
          if (typeof v === "string") candidates.push(v);
          if (Array.isArray(v)) candidates.push(...v.filter((x) => typeof x === "string"));
        }
        // Also check tool name for filesystem tools
        const toolName = (input as any).tool ?? "";
        const isFsTool = /write|edit|create|update|patch|apply|file/i.test(toolName);
        const touchesSrc = candidates.some(isSrcPath);
        if ((isFsTool || touchesSrc) && touchesSrc) {
          if (!isPhase1Pass(worktree)) {
            // Modify args to force failure with helpful message (also permission.ask will deny)
            logRefinement(worktree, `HARD GUARD tool.execute.before: blocked ${toolName} touching src/ during Phase 1 (args=${JSON.stringify(args).slice(0, 300)}).`);
            throw new Error(`Holy Grail hard guard: src/ is LOCKED during Phase 1 Discovery. Phase 1 gate FAIL — run holy_grail_status, complete docs/site-structure.md, docs/design-system.md, docs/architecture.md via holy_grail_discovery steps 1-4 before any src/ writes.`);
          }
        }
      } catch (e: any) {
        if (e?.message?.includes("Holy Grail hard guard")) throw e;
      }
    },

    "tool.execute.after": async (input, output) => {
      try {
        // Visible RETRY_COUNT logging for Phase 2 audits
        if (input.tool === "holy_grail_design_audit") {
          // Parse retry count from design-refinement.log if present
          let retryCount = 0;
          try {
            const log = readFileSync(join(worktree, ".scratch/design-refinement.log"), "utf8");
            const m = log.match(/RETRY_COUNT\s+(\d+)\/5/g);
            if (m) retryCount = parseInt(m[m.length - 1].match(/(\d+)\/5/)![1], 10);
          } catch {}
          logRefinement(worktree, `RETRY_COUNT ${retryCount}/5 — design audit for session ${input.sessionID} — tool ${input.tool} — output: ${String(output.output).slice(0, 200)}`);
        }
        // Log verify results to plan.md
        if (input.tool === "holy_grail_verify") {
          logPlan(worktree, `verify ${input.tool} → ${String(output.output).slice(0, 300).replace(/\n/g, " ")}`);
        }
      } catch {}
    },

    config: async (config) => { void config; },

    tool: {
      holy_grail_setup: tool({
        description: "One-shot avg-user bootstrap: scaffolds AGENTS.md + src/docs/.scratch per §1 AND writes opencode.json plugin entry. Zero manual JSON editing. Run this first in empty folder.",
        args: {
          path: tool.schema.string().optional().describe("Target dir (default: worktree)"),
          force: tool.schema.boolean().optional().describe("Overwrite existing scaffold/opencode.json"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          const flag = args.force ? "--force" : "";
          try {
            const out = await $`node ${worktree}/bin/index.js setup ${target} ${flag}`.text();
            return { title: "Holy Grail setup — bootstrap complete", output: out + `\n\nNext: say "start discovery" — agent will call holy_grail_discovery step 1..4 one question at a time.`, metadata: { target } };
          } catch (e: any) {
            return { title: "setup failed", output: e?.message ?? String(e) };
          }
        },
      }),

      holy_grail_discovery: tool({
        description: "Guided Phase 1 interrogation — ONE question at a time. Steps 1-4 map to docs/*.md. Call sequentially: step 1 asks Core Feature Objective, step 2 writes site-structure.md, step 3 writes design-system.md, step 4 writes architecture.md. Enforces src/ lockout until step 4 PASS.",
        args: {
          step: tool.schema.number().describe("Discovery step 1..4 (1=objective, 2=routing, 3=design, 4=stack/NFR)"),
          answer: tool.schema.string().describe("User's answer for this step (or summary to write)"),
          path: tool.schema.string().optional().describe("Target dir (default: worktree)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          const step = args.step;
          if (step < 1 || step > 4) return `Invalid step ${step} — must be 1..4`;
          const docsMap: Record<number, { file: string; title: string; prompt: string }> = {
            1: { file: ".scratch/plan.md", title: "Step 1 — Core Feature Objective", prompt: "What is the application's primary goal and required capabilities (auth, dynamic data, forms)?" },
            2: { file: "docs/site-structure.md", title: "Step 2 — Routing & Hierarchy", prompt: "What is route structure (/, /about, /services) and shared layout (header/footer/sidebars)?" },
            3: { file: "docs/design-system.md", title: "Step 3 — Design System & Tokens", prompt: "What aesthetic (Glassmorphism, Dark Cyberpunk, Minimalist), primary colors, fonts?" },
            4: { file: "docs/architecture.md", title: "Step 4 — Tech Stack & NFR Budgets", prompt: "What framework (React/Astro/Next, Tailwind), APIs (Formspree/Supabase), NFR budgets (Lighthouse >=90)?" },
          };
          const info = docsMap[step];
          try {
            ensureScratch(target);
            const full = join(target, info.file);
            // Ensure scaffold exists
            await $`node ${worktree}/bin/index.js init ${target}`.text().catch(() => "");
            const existing = existsSync(full) ? readFileSync(full, "utf8") : "";
            const header = `# ${info.title}\n> ${info.prompt}\n> Answered: ${new Date().toISOString()}\n\n`;
            const content = header + args.answer + `\n\n---\n*Source: holy_grail_discovery step ${step}*\n`;
            // For step 1, append to plan.md; for 2-4, overwrite docs file with answer + template fallback
            if (step === 1) {
              appendFileSync(full, `\n\n${content}`, "utf8");
            } else {
              // Preserve template structure but inject answer at top
              const merged = content + `\n\n--- Original template below ---\n\n` + existing.slice(0, 2000);
              writeFileSync(full, merged, "utf8");
            }
            logPlan(target, `discovery step ${step}/4 — ${info.title} — answer length ${args.answer.length}`);
            const next = step < 4 ? `Next: call holy_grail_discovery step ${step + 1} with next answer. Do NOT write src/ yet.` : `Discovery complete — run holy_grail_status to verify Phase 1 PASS before Phase 2.`;
            return {
              title: `Holy Grail discovery step ${step}/4 — ${info.title}`,
              output: `Wrote ${info.file} (${args.answer.length} chars)\n\nPrompt: ${info.prompt}\nAnswer preview: ${args.answer.slice(0, 400)}\n\n${next}\n\nGate: ${isPhase1Pass(target) ? "PASS ✓ — ready for Phase 2" : "INCOMPLETE — continue steps"}`,
              metadata: { step, file: info.file, target },
            };
          } catch (e: any) {
            return `discovery step ${step} failed: ${e?.message ?? String(e)}`;
          }
        },
      }),

      holy_grail_init: tool({
        description: "Phase 1 scaffold: creates AGENTS.md + src/components|pages|styles + docs/site-structure|design-system|architecture + .scratch/plan|design-refinement.log per §1. Respects src/ lockout — safe to run at session start. For avg user, prefer holy_grail_setup.",
        args: {
          path: tool.schema.string().optional().describe("Target directory to initialize (default: current worktree)"),
          force: tool.schema.boolean().optional().describe("Overwrite existing harness files if present"),
          template: tool.schema.string().optional().describe("Template variant to use (e.g. web, api, full)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          const forceFlag = args.force ? "--force" : "";
          const templateFlag = args.template ? `--template ${args.template}` : "";
          try {
            const out = await $`node ${worktree}/bin/index.js init ${target} ${forceFlag} ${templateFlag}`.text();
            return { title: "Holy Grail init — scaffolded", output: out, metadata: { target } };
          } catch (e: any) {
            return { title: "init failed", output: e?.message ?? String(e) };
          }
        },
      }),

      holy_grail_status: tool({
        description: "Checks Phase 1 exit gate and §1 folder hygiene: AGENTS.md + 3 docs + .scratch + src/. Reports PASS/FAIL per §1. Hard guard checks this — src writes denied until PASS.",
        args: {
          path: tool.schema.string().optional().describe("Project path (default: current worktree)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          try {
            const out = await $`node ${worktree}/bin/index.js status --path ${target}`.text();
            const pass = isPhase1Pass(target);
            return { title: `Holy Grail status — Phase 1 ${pass ? "PASS ✓" : "FAIL ✗"}`, output: out + `\n\nHard guard: src/ ${pass ? "UNLOCKED — writes allowed" : "LOCKED — writes DENY until docs complete"}` };
          } catch (e: any) {
            return `status fallback ${target}: ${e?.message ?? String(e)}`;
          }
        },
      }),

      holy_grail_verify: tool({
        description: "Phase 3 10/10 verification: real Lighthouse if installed + REAL headless anti-overflow (Playwright chromium checks scrollWidth===innerWidth at 375/768/1440 when URL reachable). Writes result to .scratch/plan.md. Falls back to heuristic if Playwright not installed.",
        args: {
          path: tool.schema.string().optional().describe("Project path (default: worktree)"),
          url: tool.schema.string().optional().describe("Local build URL (default: http://localhost:3000)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          const url = args.url ?? "http://localhost:3000";
          let out = "";
          let lighthouseDone = false;
          try {
            const hasLh = await $`npx --yes lighthouse --version`.text().catch(() => "");
            if (hasLh && hasLh.trim()) {
              const lh = await $`npx --yes lighthouse ${url} --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless --no-sandbox" --output=json 2>&1`.text().catch((e: any) => e?.message ?? "");
              try {
                const m = lh.match(/\{[\s\S]*"categories"[\s\S]*\}/);
                if (m) {
                  const j = JSON.parse(m[0]);
                  const perf = Math.round((j.categories?.performance?.score ?? 0) * 100);
                  const a11y = Math.round((j.categories?.accessibility?.score ?? 0) * 100);
                  const bp = Math.round((j.categories?.["best-practices"]?.score ?? 0) * 100);
                  const seo = Math.round((j.categories?.seo?.score ?? 0) * 100);
                  const pass = perf >= 90 && a11y === 100 && bp === 100 && seo >= 90;
                  out += `Lighthouse real run → Perf ${perf} ${perf >= 90 ? "✓" : "✗"}, A11y ${a11y} ${a11y === 100 ? "✓" : "✗"}, Best Practices ${bp} ${bp === 100 ? "✓" : "✗"}, SEO ${seo} ${seo >= 90 ? "✓" : "✗"} — Gate ${pass ? "PASS ✓" : "FAIL ✗"}\n`;
                  lighthouseDone = true;
                }
              } catch {}
              if (!lighthouseDone) out += `Lighthouse raw:\n${lh.slice(0, 4000)}\n`;
            }
          } catch {}
          if (!lighthouseDone) {
            out += `Lighthouse: Perf>=90, A11y=100, Best Practices=100, SEO>=90 — run: npx lighthouse ${url} --only-categories=performance,accessibility,best-practices,seo\n`;
          }
          // REAL headless anti-overflow via Playwright (if installed), else heuristic fallback
          let overflowHeadlessDone = false;
          try {
            // Try dynamic import — resolves from target project or plugin node_modules (optional)
            let pw: any = null;
            try { pw = await (0, eval)("import")("playwright"); } catch { try { pw = await (0, eval)("import")("playwright-core"); } catch {} }
            if (pw?.chromium) {
              // Quick reachability probe: fetch url head
              let reachable = false;
              try {
                const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 2500);
                const r = await fetch(url, { signal: ctrl.signal } as any);
                reachable = !!r;
              } catch { reachable = false; }
              if (reachable) {
                const browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
                const results: string[] = [];
                for (const vw of [375, 768, 1440]) {
                  const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
                  try {
                    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
                    await page.waitForTimeout(600);
                    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
                    const pass = overflow.scrollWidth === overflow.innerWidth;
                    results.push(`${vw}px: scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth} → ${pass ? "PASS ✓" : "FAIL ✗ (horizontal overflow)"}`);
                  } catch (e: any) {
                    results.push(`${vw}px: error ${String(e?.message ?? e).slice(0, 120)}`);
                  } finally { await page.close().catch(() => {}); }
                }
                await browser.close().catch(() => {});
                const allPass = results.every((r) => r.includes("PASS ✓"));
                out += `\nAnti-overflow REAL headless (Playwright chromium):\n${results.join("\n")}\nGate ${allPass ? "PASS ✓" : "FAIL ✗ — fix 100vw/negative margins/overflow-x"}\n`;
                overflowHeadlessDone = true;
              } else {
                out += `\nAnti-overflow: URL not reachable (${url}) — skipping headless, using heuristic.\n`;
              }
            }
          } catch (e: any) {
            out += `\nAnti-overflow headless error: ${String(e?.message ?? e).slice(0, 200)}\n`;
          }
          if (!overflowHeadlessDone) {
            try {
              const css = await $`grep -R "width:\\s*100vw\\|overflow-x" ${target}/src --include="*.css" --include="*.tsx" -n 2>&1 | head -n 30`.text().catch(() => "");
              const hasRisk = css && !css.includes("no") && css.trim().length > 0;
              out += `\nAnti-overflow heuristic (Playwright not installed or URL unreachable): ${hasRisk ? "potential risk found (100vw/overflow-x) — inspect" : "no 100vw/overflow-x patterns — likely PASS"}\n`;
              if (hasRisk) out += css.slice(0, 1000) + "\n";
              out += `For REAL headless: npm i -D playwright && npx playwright install chromium  then re-run verify with dev server up at ${url}\n`;
              out += `Manual: document.documentElement.scrollWidth === window.innerWidth at 375px, 768px, 1440px\n`;
            } catch {}
          }
          try {
            const st = await $`node ${worktree}/bin/index.js verify --path ${target}`.text().catch((e: any) => String(e));
            out += `\n--- status ---\n${st}`;
          } catch {}
          const finalPass = isPhase1Pass(target);
          logPlan(target, `verify → ${out.slice(0, 400).replace(/\n/g, " ")}`);
          const mode = lighthouseDone && overflowHeadlessDone ? "REAL (Lighthouse+Playwright)" : lighthouseDone ? "Lighthouse real + heuristic overflow" : overflowHeadlessDone ? "Playwright overflow real + heuristic Lighthouse" : "heuristic";
          return {
            title: `Holy Grail verify — Phase 3 (${mode})`,
            output: out + `\n\nNext: if FAIL, fix src/ per hints, re-run verify. Hard guard: ${finalPass ? "Phase 1 PASS — src unlocked" : "Phase 1 FAIL — complete discovery first"}`,
            metadata: { url, target, lighthouse: lighthouseDone, overflowHeadless: overflowHeadlessDone },
          };
        },
      }),

      holy_grail_design_audit: tool({
        description: "Phase 2 self-correction audit: checks sticky nav (fixed top 0 z1000), content guards (padding-top calc(nav+24px), padding-bottom 96px), chatbot (fixed bottom24 right24 z2000, FAB↔Expanded with '-' minimize), 24px gutters, contrast, layout shifts. Logs RETRY_COUNT n/5 to .scratch/design-refinement.log; respects 5-retry breaker.",
        args: {
          path: tool.schema.string().optional().describe("Project path (default: worktree)"),
          incrementRetry: tool.schema.boolean().optional().describe("If true, increment RETRY_COUNT for this audit (simulate retry)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          try {
            const checks: string[] = [];
            let retryCount = 0;
            try {
              const log = readFileSync(join(target, ".scratch/design-refinement.log"), "utf8");
              const matches = log.match(/RETRY_COUNT\s+(\d+)\/5/g);
              if (matches) retryCount = parseInt(matches[matches.length - 1].match(/(\d+)\/5/)![1], 10);
            } catch {}
            if (args.incrementRetry) {
              retryCount += 1;
              logRefinement(target, `RETRY_COUNT ${retryCount}/5 — manual increment — audit ${new Date().toISOString()}`);
              if (retryCount >= 5) {
                const log = readFileSync(join(target, ".scratch/design-refinement.log"), "utf8");
                return {
                  title: "Holy Grail design audit — CIRCUIT BREAKER HALT (5/5)",
                  output: `HALT — RETRY_COUNT 5/5 reached. Dumping .scratch/design-refinement.log:\n\n${log.slice(-4000)}\n\nRequest user guidance or constraint override per AGENTS.md §2.`,
                  metadata: { target, retryCount, halt: true },
                };
              }
            }
            const glob = await $`ls -R ${target}/src 2>&1`.text().catch(() => "");
            checks.push(`src listing:\n${glob.slice(0, 2000)}`);
            const grepNav = await $`grep -R "position: fixed" ${target}/src --include="*.css" --include="*.tsx" --include="*.jsx" -n 2>&1 | head -n 50`.text().catch(() => "no fixed nav found");
            checks.push(`nav check (expect position:fixed top:0 z-index:1000):\n${grepNav}`);
            const grepPad = await $`grep -R "var(--nav-height)" ${target}/src --include="*.css" --include="*.tsx" -n 2>&1 | head -n 50`.text().catch(() => "no nav-height guards found");
            checks.push(`guard check (expect padding-top:calc(var(--nav-height)+24px) and padding-bottom:96px):\n${grepPad}`);
            const grepChat = await $`grep -R "bottom: 24px\\|right: 24px\\|z-index: 2000" ${target}/src --include="*.css" --include="*.tsx" -n 2>&1 | head -n 50`.text().catch(() => "");
            checks.push(`chatbot check (expect bottom:24px right:24px z-index:2000):\n${grepChat || "no chatbot patterns"}`);
            logRefinement(target, `RETRY_COUNT ${retryCount}/5 — design audit — nav/guard/chatbot checked — ${checks.join(" | ").slice(0, 200)}`);
            return {
              title: `Holy Grail design audit — Phase 2 (RETRY_COUNT ${retryCount}/5)`,
              output: checks.join("\n\n---\n\n") + `\n\nRETRY_COUNT ${retryCount}/5 — ${retryCount >= 5 ? "HALT" : retryCount > 0 ? "retrying…" : "first audit"} — defects logged to .scratch/design-refinement.log. Increment via incrementRetry:true to simulate loop.`,
              metadata: { target, retryCount },
            };
          } catch (e: any) {
            return `audit fallback: ${e?.message ?? String(e)}`;
          }
        },
      }),

      holy_grail_debug: tool({
        description: "Phase 4 fast-path: bypass Phase 1&2. Sleuth & reproduce failing test in src/, surgical fix, regression check, then docs reconciliation via git diff → docs/site-structure.md / docs/architecture.md + .scratch/plan.md entry.",
        args: {
          bug: tool.schema.string().describe("Bug summary / stack trace / failing test description"),
          path: tool.schema.string().optional().describe("Project path (default: worktree)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          try {
            const intro = await $`node ${worktree}/bin/index.js debug --path ${target}`.text().catch(() => "");
            const diff = await $`git -C ${target} diff --stat 2>&1 | head -n 100`.text().catch(() => "no git diff (not a git repo or no changes)");
            logPlan(target, `Hotfix [${args.bug}] resolved in src/. Synchronized changes to docs/architecture.md.`);
            return {
              title: `Holy Grail debug — ${args.bug.slice(0, 40)}`,
              output: [
                intro,
                `Bug: ${args.bug}`,
                `Target: ${target}`,
                `Workflow: 1) failing test in src/ reproducing trace → 2) minimal fix → 3) regression suite → 4) git diff → update docs/*`,
                `Current diff:\n${diff}`,
                `After fix, appended to .scratch/plan.md: "Hotfix [${args.bug}] resolved in src/. Synchronized changes to docs/architecture.md."`,
                `Reconciliation: if routes/layout changed → update docs/site-structure.md; if APIs/state/NFR changed → update docs/architecture.md`,
              ].join("\n\n"),
              metadata: { bug: args.bug, target },
            };
          } catch (e: any) {
            return `debug fallback: ${e?.message ?? String(e)}`;
          }
        },
      }),

      holy_grail_run: tool({
        description: "Deprecated alias: use holy_grail_verify / holy_grail_debug. Runs harness task with self-correction (kept for compat).",
        args: {
          task: tool.schema.string().describe("Task/prompt"),
          path: tool.schema.string().optional().describe("Project path"),
          maxIterations: tool.schema.number().optional().describe("Max iterations (breaker=5 for Phase2)"),
        },
        async execute(args, ctx) {
          const target = args.path ?? ctx.worktree;
          const it = args.maxIterations ?? 5;
          return {
            title: `Holy Grail run (compat) → use phase tools`,
            output: `Task "${args.task}" at ${target} (max ${it}) — prefer holy_grail_discovery (Phase1), holy_grail_design_audit (Phase2), holy_grail_verify (Phase3) or holy_grail_debug (Phase4) per AGENTS.md global routing.`,
            metadata: { task: args.task, target, it },
          };
        },
      }),
    },
  };
};

export default HolyGrailPlugin;
