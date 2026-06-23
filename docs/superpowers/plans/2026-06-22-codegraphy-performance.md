# CodeGraphy Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CodeGraphy feel snappy on the CodeGraphy monorepo by measuring load and interaction latency, then landing small deterministic optimizations that improve those numbers.

**Architecture:** Treat performance as a product contract across the Core Package and VS Code Extension. Measure Indexing, Graph Cache reads, Graph Projection, Graph Query, Graph Scope toggles, and Visible Graph updates separately so each optimization has a clear before/after number.

**Tech Stack:** pnpm, Turbo, Vitest, Playwright VS Code acceptance tests, CodeGraphy Core Package, CodeGraphy VS Code Extension, Graph Cache, and optional Mac mini validation for heavy browser runs.

---

## Baseline Evidence

- Branch: `codex/speed-up-codegraphy`
- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4/.worktrees/speed-up-codegraphy`
- Trello card: `https://trello.com/c/TKoE7wEI`
- User settings baseline: branch starts from local `main` commit `5108cc320 settings`, which updates `.codegraphy/settings.json`.
- First full test attempt: `pnpm run test` failed because the timing wrapper launched `/usr/local/bin/pnpm` under Node `v19.5.0`; `@poleski/quality-tools` needs `path.matchesGlob`.
- Environment correction: use `PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /opt/homebrew/bin/pnpm ...`.
- Verification of correction: `PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /opt/homebrew/bin/pnpm --filter @codegraphy-dev/extension exec vitest run tests/playwrightVscodeConfig.test.ts --config vitest.config.ts --project node` passed 6 tests in 2.15s.
- Corrected full test baseline: `PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /usr/bin/time -l /opt/homebrew/bin/pnpm run test` passed in 1523.98s wall time.
- Unit baseline: `1009 passed` test files, `6039 passed` tests, `158.33s` extension-package Vitest duration, `2m39.381s` Turbo unit task wall time.
- Slow unit canary: `packages/extension/tests/extension/pipeline/examplesWorkspace.test.ts` took `56006ms` and `45842ms` for the two examples-workspace tests.
- Playwright baseline: `119 passed (22.3m)`, `22m42.903s` task wall time; slow file `tests/playwright-vscode/generated/runtime.ts (21.5m)`.
- Cold monorepo CLI indexing baseline: local `node packages/core/bin/codegraphy.js --verbose index .` from no Graph Cache took `214.04s` wall time for 2365 files, 5075 nodes, and 9097 edges.
- Cold index output: `.codegraphy/graph.lbug` is 62MB, `/usr/bin/time -l` reported `2708193280` maximum resident set size and `4201907648` peak memory footprint.
- Phase-instrumented cold monorepo CLI indexing took `213.93s` wall time for 2367 files, 5078 nodes, and 9114 edges.
- Phase split: plugin load `542ms`, plugin initialization `1ms`, file discovery `1900ms`, file analysis `88321ms`, graph build `62ms`, Graph Cache save `122757ms`, metadata persistence `4ms`.
- Measured hot spots: Graph Cache persistence and file/plugin analysis. Graph construction is not a cold-load bottleneck on this workspace.
- Canonical Graph Cache write iteration: cold indexing improved to `111.03s` wall time; Graph Cache save improved to `15139ms`; Graph Cache size improved from `64638976` bytes to `18153472` bytes.
- Shared content read cache iteration: cold indexing improved to `104.81s`; file/plugin analysis improved to `87297ms`; Graph Cache save stayed stable at `14632ms`.
- Remaining measured cold-load hot spot: file/plugin analysis at `87297ms` on the shared-content run.
- Godot class-name metadata fast path improved cold indexing from `104.67s` to `37.27s` and file analysis from `87918ms` to `23352ms`.
- TypeScript alias-config no-scan parsing improved cold indexing from `37.27s` to `17.28s` and file analysis from `23352ms` to `3697ms`.
- Warm Graph Cache query proxy took `0.74s` wall time with a `601ms` diagnostic duration for a `2514` node / `9108` edge query graph.
- Visible Graph projection benchmark before filter optimization: current settings `775ms` median / `933ms` p95, folders-on Graph Scope `1369ms` median / `1445ms` p95, import-edge-hidden `153ms` median.
- Visible Graph projection after reusable glob matchers and skipping direct edge matching for path-only filters: current settings `22ms` median / `26ms` p95, folders-on Graph Scope `31ms` median / `32ms` p95, import-edge-hidden `17ms` median / `18ms` p95.
- Visible Graph scenario node and edge counts stayed unchanged across the filter optimization.
- VS Code graph view benchmark first run: first rendered graph stats took `57209ms`; Imports Graph Scope toggle was `3127ms` median / `3143ms` p95.
- VS Code graph view benchmark repeat run: first rendered graph stats took `9917ms`; Imports Graph Scope toggle was `2983ms` median / `3079ms` p95.
- Current user-facing bottleneck moved to graph surface/runtime/render work after visible graph derivation.
- Raw logs are ignored under `reports/performance/`; commit only scripts and bounded summaries under `docs/performance/`.

## Success Metrics

- Cold monorepo Indexing wall time from no Graph Cache.
- Warm monorepo Graph Cache load to first Visible Graph payload.
- Graph Cache Sync time when the cache is readable but settings, plugin state, or changed files need reconciliation.
- Graph Scope toggle latency from UI action to updated Visible Graph payload.
- Display Setting toggle latency for controls that should not rebuild graph data.
- File save Live Update latency for one changed source file.
- Visible Graph payload size: node count, edge count, serialized message bytes.
- Webview apply/render latency after `GRAPH_DATA_UPDATED`.

## Task 1: Stabilize The Baseline Harness

**Files:**
- Create: `docs/superpowers/plans/2026-06-22-codegraphy-performance.md`
- Read: `package.json`
- Read: `packages/extension/package.json`
- Read: `packages/extension/playwright.vscode.config.ts`
- Read: `packages/extension/tests/extension/pipeline/examplesWorkspace.test.ts`

- [x] **Step 1: Create an isolated branch and Trello card**

Run:

```bash
git worktree add .worktrees/speed-up-codegraphy -b codex/speed-up-codegraphy main
```

Expected: worktree created on `codex/speed-up-codegraphy`.

- [x] **Step 2: Install dependencies in the worktree**

Run:

```bash
pnpm install
```

Expected: lockfile unchanged and packages installed.

- [x] **Step 3: Run the baseline full test command**

Run:

```bash
PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /usr/bin/time -l /opt/homebrew/bin/pnpm run test 2>&1 | tee reports/performance/baseline-test-node22-2026-06-22.log
```

Expected: test output is captured. If Playwright is too slow locally, record the partial result and move future Playwright repeats to the Mac mini.

- [x] **Step 4: Summarize baseline timings**

Run:

```bash
rg -n "Test Files|Tests |Duration|Time:|real|WorkspacePipeline examples workspace|Graph built|Discovered|Analysis:" reports/performance/baseline-test-node22-2026-06-22.log
```

Expected: baseline notes include unit time, Playwright time, and the slow examples workspace test timings.

- [x] **Step 5: Commit the setup**

Run:

```bash
git add docs/superpowers/plans/2026-06-22-codegraphy-performance.md
git commit -m "docs: plan CodeGraphy performance investigation"
git push -u origin codex/speed-up-codegraphy
```

Expected: setup commit is pushed before implementation edits.

## Task 2: Add A Deterministic Monorepo Performance Runner

**Files:**
- Create: `scripts/performance/measure-codegraphy-monorepo.mjs`
- Create: `docs/performance/codegraphy-monorepo.md`
- Modify: `package.json`
- Test: `tests/scripts/measure-codegraphy-monorepo.test.mjs`

- [x] **Step 1: Write the failing script test**

Create `tests/scripts/measure-codegraphy-monorepo.test.mjs` with checks that the runner:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("performance runner writes bounded JSON metrics", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "codegraphy-perf-"));
  const outputPath = path.join(tempDir, "metrics.json");

  try {
    const moduleUrl = pathToFileURL(path.resolve("scripts/performance/measure-codegraphy-monorepo.mjs")).href;
    const { writeMetrics } = await import(moduleUrl);

    await writeMetrics({
      outputPath,
      workspacePath: tempDir,
      measurements: {
        coldIndexMs: 100,
        warmQueryMs: 20,
        nodeCount: 2,
        edgeCount: 1,
        payloadBytes: 512
      }
    });

    const metrics = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(metrics.workspacePath, tempDir);
    assert.equal(metrics.measurements.coldIndexMs, 100);
    assert.equal(metrics.measurements.warmQueryMs, 20);
    assert.equal(metrics.measurements.nodeCount, 2);
    assert.equal(metrics.measurements.edgeCount, 1);
    assert.equal(metrics.measurements.payloadBytes, 512);
    assert.match(metrics.recordedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
```

Run:

```bash
node --test tests/scripts/measure-codegraphy-monorepo.test.mjs
```

Expected: FAIL because `scripts/performance/measure-codegraphy-monorepo.mjs` does not exist.

- [x] **Step 2: Implement minimal metrics writing**

Create `scripts/performance/measure-codegraphy-monorepo.mjs` with exported `writeMetrics` and a CLI entry point that writes raw JSON to `reports/performance/monorepo-latest.json`. Durable reviewed summaries belong in `docs/performance/`.

- [x] **Step 3: Run the test to green**

Run:

```bash
node --test tests/scripts/measure-codegraphy-monorepo.test.mjs
```

Expected: PASS.

- [x] **Step 4: Wire the package script**

Add this root script:

```json
"perf:codegraphy-monorepo": "node scripts/performance/measure-codegraphy-monorepo.mjs --workspace ."
```

- [x] **Step 5: Commit the harness**

Run:

```bash
git add package.json scripts/performance/measure-codegraphy-monorepo.mjs tests/scripts/measure-codegraphy-monorepo.test.mjs docs/performance/codegraphy-monorepo.md
git commit -m "test: add CodeGraphy monorepo performance harness"
git push
```

## Task 3: Capture Current Monorepo Load And Interaction Numbers

**Files:**
- Modify: `scripts/performance/measure-codegraphy-monorepo.mjs`
- Create: `docs/performance/codegraphy-monorepo.md`

- [x] **Step 1: Measure headless Core Package timings**

Run the performance script against `/Users/poleski/Desktop/Projects/CodeGraphyV4/.worktrees/speed-up-codegraphy` using the branch settings. Record cold Indexing, warm Graph Cache query, node count, edge count, and payload bytes.

Current cold-index command:

```bash
PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /usr/bin/time -l node packages/core/bin/codegraphy.js --verbose index . 2>&1 | tee reports/performance/codegraphy-index-cold-phases-local-node22-2026-06-22.log
PATH=/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH /opt/homebrew/bin/pnpm run perf:codegraphy-monorepo -- --index-log reports/performance/codegraphy-index-cold-phases-local-node22-2026-06-22.log
```

- [x] **Step 2: Measure VS Code user-facing timings**

Use the Playwright VS Code lane or the Mac mini to open the same workspace and capture:

```text
open workspace -> first graph payload
Graph Scope toggle -> updated graph payload
Display Setting toggle -> updated view state
single file save -> Live Update complete
```

- [x] **Step 3: Commit the baseline metrics**

Commit the bounded summary and keep raw logs ignored under `reports/performance/`.

## Task 4: Optimize One Bottleneck At A Time

**Files:** To be decided by measured bottleneck.

- [ ] **Step 1: Rank hypotheses after baseline**

Start with these falsifiable hypotheses:

```text
If Graph Cache persistence spends over half of cold load writing cache records, then reducing cache payload size or batching/storage strategy will cut cold Indexing wall time without changing graph counts.
If file/plugin analysis spends most of the remaining cold load, then per-plugin phase diagnostics and cacheable analysis reuse will identify the plugin/file classes worth optimizing first.
If Graph Scope toggles rebuild graph data unnecessarily, then separating Display Setting updates from Graph Query updates will reduce toggle latency without changing node or edge counts.
If warm startup waits for full Graph Cache Sync before showing cached data, then rendering cached Visible Graph first will reduce time-to-first-graph while Graph Cache Sync continues in the background.
If large Visible Graph messages dominate interaction latency, then avoiding unchanged payload resend or using smaller incremental messages will reduce webview apply latency and message bytes.
If plugin analysis runs on files that cannot be affected by a changed setting, then narrowing reprocessing to affected providers/files will reduce Live Update and Graph Cache Sync time.
```

- [x] **Step 2: Add or extend a failing test for the selected bottleneck**

Use the closest seam: Core Package Graph Query tests for headless data work, Extension provider tests for message routing and refresh decisions, or Playwright for UI latency.

- [x] **Step 3: Implement the smallest behavior change**

Keep each commit scoped to one measured path.

- [x] **Step 4: Re-run the targeted test and performance harness**

Compare the metric before committing.

- [x] **Step 5: Commit and push**

Commit each improvement separately with the metric delta in the commit body or PR comment.

Latest committed improvement:

```text
Settled interactive graph updates skip force-graph cooldown ticks.
Imports Graph Scope toggle: 2983ms median / 3079ms p95 before, 1925ms median / 2341ms p95 after.
2D arrow constants: 1925ms median / 2341ms p95 before, 1595ms median / 1620ms p95 after.
Fresh same-environment control before viewport memoization: 2891ms median / 3563ms p95.
Rejected stable-edge visibility callbacks: 2918ms to 2922ms median, no improvement.
Memoized viewport surface: 2891ms median / 3563ms p95 control, 1628ms median / 2252ms p95 after.
Instrumented webview stages: 1748ms median / 2272ms p95; applyLegendRules was ~460ms-490ms per pass.
Compiled legend matchers: 835ms median / 846ms p95; applyLegendRules now ~79ms-83ms per pass.
Skipped value-equal graph control echoes: 493ms median / 497ms p95; one visibleGraph.derive event per toggle sample.
Rejected stable filter matcher cache: 494ms median / 513ms p95; derive stayed ~176.7ms, so no measured win.
Cached recent visible-graph derivations: 313ms median / 345ms p95; sampled toggles had no visibleGraph.derive events.
Cached recent style and legend stages: 236ms median / 270ms p95; sampled toggles had no derive/style/legend events.
Rendered edge-only Graph Scope changes immediately: 203ms median / 226ms p95; Imports toggles now emit renderImmediate instead of renderDebounced.
Added in-webview delta metric: latest wall-clock 209ms median / 219ms p95, browser-side optimistic-to-rendered 55ms median / 58ms p95.
Rejected startup timeline replay reorder: first graph readiness regressed from 6377ms to 7285ms; reverted.
Added startup phase metrics: latest first graph readiness 6789ms split into 1709ms command/open, 5032ms acceptance-ready frame, 35ms stats wait; startup webview data stages are sub-second.
Lazy-loaded 3D runtime: default webview index.js 2242.28 kB -> 819.25 kB minified; latest Imports toggle 193ms median / 203ms p95, first graph readiness flat at 6936ms.
Added startup handshake markers and skipped settled duplicate graph payload replay: webview document reaches first stats at ~340ms after ready/data/bootstrap markers, duplicate 5088 node / 9146 edge replay is skipped in ~5ms, and the extra visible-graph/render pass is gone; first graph readiness remains flat at ~6987ms due to frame readiness.
Added extension-host startup markers: provider resolve/html/context/flush work takes only 2ms-3ms, ruling it out as the remaining first-load bottleneck; a noisy first-ready run still spent 12500ms in frame readiness, while the webview-side 74-filter derive pass took 498.4ms.
Combined visible-graph filter glob patterns into one matcher: startup 74-filter derive over the 24522 node / 20781 edge payload dropped from 498.4ms to 244ms, and first graph stats after webview document start moved from 843.3ms to 586.4ms; first-ready wall clock remains frame-readiness dominated.
Added command-open markers and extended only the performance harness frame wait: command dispatch completes at 38ms, provider resolve starts at 43ms, and webview.html is assigned at 45ms, so the latest 40497ms first-ready outlier is after HTML assignment and before the harness can observe the VS Code webview frame/document.
Added frame lifecycle markers and startup-ready partial metrics: early webview frames attach/navigate around 1.8s-2.0s, but the usable graph-ready fake.html frame appeared around 37.0s in the latest run; the harness now preserves startup evidence before Graph Scope interaction sampling.
Skipped duplicate graph payloads before bootstrap completion: focused test locks the loading-state behavior; latest startup event stream had one GRAPH_DATA_UPDATED payload and no repeated 74-filter derive before bootstrap, with stats rendered at 597.9ms after the usable document started and Imports toggle at 213ms median / 267ms p95.
Rejected direct Graph View focus before container fallback: first graph readiness stayed frame-readiness dominated at 39359ms, with webview.html assigned at 50ms and the acceptance-ready frame bucket at 37734ms, so the command-path change was reverted.
Deferred visible graph derivation while startup loading hides the graph, skipped unchanged post-load filter pattern replay, and fixed harness in-webview delta pairing: latest startup stream has no 22304-node derive before APP_BOOTSTRAP_COMPLETE, bootstrap at 512.8ms, first real 74-filter derive at 696.6ms for 183.8ms, stats at 892.1ms after document start, Imports toggle at 202ms median / 220ms p95 wall-clock and 53ms median / 56ms p95 in-webview.
Rejected early APP_BOOTSTRAP_COMPLETE reordering: moving bootstrap before graph load and then before cached timeline replay did not move the real browser event stream; bootstrap still arrived after graph data at 1662.6ms/1682.2ms and first stats stayed around 2135ms/2140ms after document start, so the production variants were reverted and the next startup work should instrument message delivery and cached timeline replay.
Added generic webview message-delivery tracing: browser-side order is now explicit, with GRAPH_DATA_UPDATED at 108.7ms, cached/settings messages around 397ms-412ms, duplicate GRAPH_DATA_UPDATED at 500.7ms, duplicate skip at 510.2ms, and APP_BOOTSTRAP_COMPLETE only after that at 510.9ms; latest Imports toggle is 201ms median / 214ms p95 wall-clock and 53ms median / 59ms p95 in-webview.
Added extension-host outbound message tracing and coalesced dense graph index progress: host GRAPH_INDEX_PROGRESS sends dropped from 7844 to 51 in startup traces; a completed 2-sample interaction run measured Imports at 357ms median / 508ms p95 wall-clock and 55ms median / 57ms p95 in-webview, while first-ready wall clock stayed dominated by the frame-readiness bucket.
Skipped duplicate WEBVIEW_READY replay while first analysis is already in flight: the early duplicate settings batch around 518ms disappeared from the host send sequence; latest 2-sample run measured Imports at 231ms median / 266ms p95 wall-clock and 50ms median / 50ms p95 in-webview, with remaining aggregate settings/control sends coming from later refresh/plugin sync paths.
Traced refresh-state send reasons: latest run recorded 22 full refresh-state replays, all tagged changedFiles, while aggregate settings/control sends remained high at SETTINGS_UPDATED 24 and GRAPH_CONTROLS_UPDATED 47; next change should preserve changed-file graph analysis while avoiding redundant indexed-incremental settings replay.
Skipped redundant full settings replay for indexed incremental changed-file refreshes: focused provider test failed red on the old `_sendAllSettings` call, then passed after the refresh runner reported `incremental` vs fallback modes; latest VS Code trace has 0 refresh-state markers, SETTINGS_UPDATED 24 -> 2, GRAPH_CONTROLS_UPDATED 47 -> 5, and a one-sample Imports sanity check at 191ms wall-clock / 49ms in-webview.
Added analysis request/publish lifecycle markers: latest startup trace shows the first cached `load` request completing without publishing after an `incremental` request starts, then the first `GRAPH_DATA_UPDATED` comes from a full `analyze` request at 36.8s; next startup fix should prevent changed-file work from preempting first cached load.
Gated incremental analysis behind first workspace readiness: focused provider test failed red when `incremental:start` raced an unresolved `load:start`, then passed after incremental waited for first ready; latest VS Code trace publishes cached `load` at 9.86s before incremental starts, moving first publish from 36.8s analyze to 9.86s load and first graph readiness from 40.6s to 13.7s in the one-sample harness.
Skipped full workspace discovery during cached Graph Cache replay: focused facade test failed red on the old discovery call, then passed with cached-path metadata; direct replacement metadata probe is 322ms vs 4083ms full discovery, and latest VS Code trace publishes cached `load` at 2.40s with first graph readiness 5.88s while visible stats remain 2300 nodes / 5345 edges.
Added cached-load/publish stage markers and reused a prepared Material Icon extension matcher: publish `groups` dropped from 748ms to 96ms, cached `load` publish moved from 2.28s to 1.70s, first graph readiness moved from 5.82s to 5.62s, and Imports sanity check measured 209ms wall-clock / 58ms in-webview.
Deferred live gitignore probing only for stale cached replay: cached discovery dropped from 324ms to 11ms, cached load completion from 836ms to 497ms, cached load publish from 1.70s to 0.63s, first graph readiness from 5.62s to 5.27s, and visible stats stayed 2300 nodes / 5345 edges while background analysis handled exact ignored metadata.
Warmed the repo-local Graph Cache when the Graph View runtime creates its analyzer: hydration dropped from 406ms to 170ms, cached load completion from 497ms to 259ms, cached load request completion from 672ms to 429ms, first graph readiness from 5266ms to 5114ms, and visible stats stayed 2300 nodes / 5345 edges.
Reused current discovery for existing-file live updates and added a live-update VS Code probe: full-discovery control was 3854ms wall / 3149ms request with 1900ms discovery; cached-discovery fast path was 1887ms wall / 1180ms request with 0ms discovery.
Added changed-file refresh phase markers: pre-analysis routing hotspot was notifyPreAnalyze at 450ms inside a 722ms request, then routing pre-analysis files by supported extension reduced notifyPreAnalyze to 0ms, analyzeFiles to 78ms, refresh completion to 176ms, and live update to 955ms wall / 267ms request.
Shortened existing-file save debounce and targeted Tree-sitter language loading: content saves now wait 100ms while file operations keep 500ms coalescing; latest live-update probe is 574ms wall / 283ms request, and targeted TypeScript Tree-sitter binding load probes at 11ms-17ms versus 62ms-205ms for loading all grammar bindings.
Skipped duplicate changed-file graph builds when analysis already covers retained files: focused Core refresh test failed red on the old fallback `_buildGraphData` call, then passed with the coverage guard; rebuilt VS Code probe removed the `buildGraphData` phase, refresh completion moved 190ms -> 144ms, incremental request 283ms -> 236ms, and live-update wall 574ms -> 545ms.
Lowered existing-file save debounce from 100ms to 50ms while keeping create/delete/rename at 500ms: focused debounce tests failed red at the 50ms boundary, then passed; VS Code live-update wall moved 545ms -> 488ms while request duration stayed flat at 237ms.
```

## Task 5: Keep The PR Reviewable

**Files:**
- Modify: PR body and Trello card comments through GitHub/Trello.

- [ ] **Step 1: Open a draft PR after the setup commit**

Include the Trello link, settings baseline note, and first test evidence.

- [ ] **Step 2: After each optimization, update the PR**

Add a short comment:

```text
Iteration N:
- Changed:
- Test:
- Metric before:
- Metric after:
- Next:
```

- [ ] **Step 3: Before final review**

Run:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run perf:codegraphy-monorepo
```

Expected: required checks pass, and the performance report shows user-visible improvement over baseline.
