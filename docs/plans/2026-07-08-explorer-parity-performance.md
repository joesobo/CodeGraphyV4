# VS Code Explorer Parity + Native-Feel Performance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is written for handoff: an engineer with zero CodeGraphy context should be able to execute it top to bottom.

## Setup

- Trello epic: [Epic: VS Code Explorer parity + native-feel performance](https://trello.com/c/hmVekNGe)
- Linked child cards (absorbed by Phase 2): copy/paste, open in terminal, compare selected, close open file, files.exclude toggle, Explorer-equivalent context menus, Escape-close panels, active-editor outline, "Open in CodeGraphy" from Explorer
- Branch: `feat/explorer-parity-performance-plan`, base `main` at `6c5eb25a2`

**Goal:** Anything you can do in the built-in VS Code File Explorer, you can do from the CodeGraphy graph — with matching behavior, matching validation standards, and matching snappiness, **measured in a real VS Code window, not a simulation**.

**Architecture:** Six linear phases. Measurement comes first, and it runs inside a real launched VS Code instance (Extension Development Host driven by `@vscode/test-electron`) so numbers reflect the end-user experience: real extension-host IPC, real webview, real disk. Because absolute timings vary per machine, the primary performance gates are **ratios against the built-in Explorer performing the equivalent operation in the same VS Code session** — the Explorer is the yardstick that travels with the machine. Machine-independent gates (payload bytes, layout-reset counts, frame budgets) stay absolute. Parity work is driven by a committed inventory table so "done" is countable. The epic ends with a proof/showcase phase and a cleanup phase that runs only after owner validation.

**Explicitly out of scope (owner decisions, 2026-07-08):**
- Arrow-key node navigation — waived; existing search substitutes.
- **All drag & drop file semantics** (drag-to-move, Alt-drag copy, external drop-in, drag-out) — removed from this plan; plain drag keeps repositioning nodes. Revisit as its own epic later (follow-up card filed in Phase 6). The two drag-related Trello child cards stay linked to the epic but are not scheduled here.

**Tech Stack:** VS Code extension host (esbuild/CJS), React webview (Vite), react-force-graph-2d/3d (d3-force under the hood), tree-sitter analysis in `packages/core`, ladybugdb Graph Cache, diagnostics event system (`packages/core/src/diagnostics/`, `docs/DIAGNOSTICS.md`), Vitest, Playwright, `@vscode/test-electron`.

## Phase map

| Phase | Name | Depends on | Exit gate summary |
| --- | --- | --- | --- |
| 1 | In-window metrics harness & baselines | — | `pnpm perf` launches real VS Code, deterministic reports, baselines committed, CI gate live |
| 2 | Explorer feature parity | 1 | Parity inventory: 0 `todo` rows |
| 3 | Performance: pipeline + dependency maximization | 1 | Ratio + absolute gates green vs Phase 1 baselines |
| 4 | Feel & polish | 2, 3 | Explorer-standard behavior gates green |
| 5 | Proof & showcase | 3, 4 | Demo artifacts + Explorer side-by-side published; owner sign-off |
| 6 | Cleanup & hardening | 5 validated by owner | Scaffolding removed, docs current, suites green |

## Monorepo package impact

| Package | Touched in | What changes |
| --- | --- | --- |
| `packages/core` | 1, 3 | Diff engine (`graph/diff.ts`), perf metric events, tree-sitter incremental parse reuse, `files.exclude` in discovery (`core/src/discovery/`), Graph Cache write scheduling — no public API breaks |
| `packages/extension` (host side) | 1–4, 6 | New FS actions in `extension/actions/` (clipboard), dispatch wiring in `graphView/webview/providerMessages/`, watcher/scheduler tuning, settings reads, perf-mode command |
| `packages/extension` (webview side) | 1–5 | Context-menu entries, keyboard map, diff-apply store handler, optimistic layer, inline rename UI, decorations, render tuning, FPS sampler |
| `packages/plugin-api` | 2 (minor, likely none) | Only if decorations become a contribution point; default is built-in — **no changes** |
| `packages/plugin-*` | none | No behavior changes; plugin menu entries regression-tested in Phases 2 and 6 |
| `packages/cli` / `packages/mcp` | none | Untouched; Phase 6 verifies no core API drift (`pnpm build` + suites) |
| CI / repo root | 1, 5, 6 | `perf/` directory, `pnpm perf` script, `.github/workflows/perf.yml` (xvfb + `@vscode/test-electron`), demo assets under `docs/assets/` |

Rule for executors: if a task forces a change outside its listed packages, stop and flag it on the epic card before proceeding — that is a scope signal, not a detail.

## Testing strategy (applies to every phase)

### Test vehicles

1. **Unit tests (Vitest)** — pure logic: diff/apply, collision naming, keyboard lookup, menu builders. `*.test.ts` next to source. ResizeObserver mock and react-force-graph mocks exist in `tests/setup.ts` / `tests/__mocks__/`.
2. **Acceptance scenarios** — required by the repo workflow for every user-visible behavior. Each parity inventory row that lands adds ≥1 scenario.
3. **In-window perf runs (primary performance truth)** — `pnpm perf` launches a real VS Code window via `@vscode/test-electron` with the built extension and a fixture workspace, runs scripted scenarios through a hidden `codegraphy.perf.runScenario` command, and collects metrics from the diagnostics event stream + webview sampler into JSON. **No headless/jsdom perf measurement anywhere in this plan** — headless numbers do not represent the end-user result. The same session also drives the built-in Explorer through the equivalent operations (via `vscode.commands.executeCommand` + `workspace.fs` timing) to produce per-machine Explorer ratios.
4. **Playwright webview harness (visual only)** — pixel gates, inline-rename overlay, decoration rendering, screenshots/recordings. Reuses the documented screenshot workflow (build webview → `screenshot.html` with `acquireVsCodeApi` mock → HTTP server → `postMessage` fixtures). Never used for performance gates.
5. **Skill-assisted Dev Host walkthroughs** — after each phase, an agent (via the `verify` / `run` skills) or the owner drives the real Extension Development Host through the phase's acceptance checklist and captures screenshot evidence. Catches wiring issues scripted runs miss.
6. **Perf CI** — the same in-window runner headful under xvfb on Linux CI: `small` + `medium` fixtures per PR, median of 3, fail >20% vs that runner's committed baselines; full sweep on `workflow_dispatch`. CI compares only against baselines recorded on the same runner class — never against a developer machine.

### Quality-tool loop (CRAP, mutation testing, organization)

Full-suite mutation testing is **not** part of this plan — it is very expensive and its cost scales with the whole codebase, not the change. Instead:

- **Scoped/differential mutation testing only:** run the mutation tool against the files a task touched (plus their direct test files). This is the repo's existing differential-mutation workflow — keep it that way.
- **Mutation results as a design signal:** when a scoped run reports mutation sites exceeding the configured per-file threshold, treat that as evidence the file has grown too large or too branchy — split it before trying to kill mutants one by one. After splitting, run the organization/structure tool over the affected area to settle imports and file placement.
- **Iterate until outputs are good:** the expected loop per task is `code → CRAP check → scoped mutation run → (split file if sites exceed threshold → organization tool) → re-run` — and it is normal to go around this loop **multiple times** on a gnarly file. A task is not done because the code works; it is done when the quality tools come back clean (CRAP ≤ 8, no surviving mutants in touched files, no over-threshold mutation-site counts).
- Phase 6 runs one final scoped pass over the epic's hot modules (diff/apply, collision naming, optimistic store) — still scoped, never full-suite.

---

## Explorer parity inventory (source of truth)

Committed as `docs/plans/explorer-parity-checklist.md` in Task 2.1 and updated as rows land. Gate 2-A counts rows here.

**Status legend:** `done` = works today (2026-07-08 audit) · `todo(P#)` = planned · `verify(P2)` = believed done, must prove · `waived` = not doing, reason given · `deferred` = future epic.

### Context menu — file

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| Open | done | `node-open`, incl. multi-select "Open N Files" |
| Open to the Side | todo(P2) | Task 2.4 |
| Open With… | todo(P2) | Task 2.4 |
| Reveal in Finder/Explorer | done | `node-reveal` |
| Open in Integrated Terminal | todo(P2) | Task 2.4 (existing Trello card) |
| Select for Compare / Compare with Selected | todo(P2) | Task 2.4 (existing Trello card) |
| Open Timeline | waived | CodeGraphy's Graph Revision/timeline view covers this |
| Cut / Copy / Paste | todo(P2) | Task 2.2 |
| Copy Path / Copy Relative Path | done | |
| Rename | done | prompt-based today; inline in Phase 4 |
| Delete (to trash) | partial → todo(P4) | delete+undo exists; trash + confirm semantics in Task 4.1 |
| Share (Copy vscode.dev Link) | waived | web-only/marginal |

### Context menu — folder

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| New File / New Folder | done | folder + background menus |
| New nested path (`a/b/c.ts` creates folders) | verify(P2) | `extension/actions/createPath.ts` exists — Task 2.1 proves it + acceptance test |
| Find in Folder… | todo(P2) | Task 2.5 |
| Paste | todo(P2) | Task 2.2 |
| Reveal / Copy paths / Rename / Delete | done | root `(root)` protected |
| Open in Integrated Terminal | todo(P2) | Task 2.4 |

### Keyboard

| Explorer binding | Status | Notes / task |
| --- | --- | --- |
| Enter = open (graph convention on all platforms), F2 = rename | Enter done, F2 todo(P2) | Task 2.3 |
| Delete / Cmd+Backspace delete | todo(P2) | Task 2.3 — currently explicitly `null` in `keyboard/command/lookup.ts` |
| Cmd/Ctrl+C, X, V | todo(P2) | Task 2.3 |
| Cmd/Ctrl+Enter open to side | todo(P2) | Task 2.3 |
| Cmd/Ctrl+A select all · Escape clear | done | fold "Escape closes panels" bug card into 2.3 |
| Cmd/Ctrl+Z / Shift+Z undo/redo file ops | todo(P2) | Task 2.3 — `undoManager` exists host-side; needs webview keyboard reach |
| Type-ahead find | waived | search bar is the graph-native equivalent |
| Arrow-key navigation | **waived (owner)** | |
| Left/Right collapse/expand | waived | folderView click expand/collapse is the equivalent |

### Behaviors & display

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| Multi-select (modifiers + range) | done | marquee; richer than Explorer |
| Auto-reveal active file (`explorer.autoReveal`) | todo(P2) | Task 2.6 — fixes "active editor outline" bug card |
| Git status decorations (M/A/U colors) | todo(P2) | Task 2.7 |
| Problems decorations (error/warning badges) | todo(P2) | Task 2.7 |
| `files.exclude` respected | todo(P2) | Task 2.5 (existing Trello card) |
| File nesting / Open Editors / sort order | waived | tree-list concepts; graph edges/layout own these |
| Drag: move, Alt-copy, external drop, drag-out | **deferred** | future epic; follow-up card filed in Phase 6 |
| Inline input for new/rename | todo(P4) | Task 4.2 |
| Delete to OS trash (`files.enableTrash`) | todo(P4) | Task 4.1 |

### Validation standards (Explorer's rules as testable gates)

| # | Explorer standard | Where enforced |
| --- | --- | --- |
| V1 | Rename/new rejects empty or whitespace-only names | Tasks 2.3/4.2 |
| V2 | Existing-name collision fails with "A file or folder **{name}** already exists at this location." (same shape) | Tasks 2.2/4.2 |
| V3 | Path separators in New File create nested folders, never error | Task 2.1 |
| V4 | Paste collision appends ` copy`, ` copy 2`, ` copy 3`… (exact scheme) | Task 2.2 |
| V5 | Delete → OS trash when `files.enableTrash`; permanent delete warns with Explorer wording | Task 4.1 |
| V6 | `explorer.confirmDelete` honored incl. "Do not ask me again" persistence | Task 4.1 |
| V7 | Every FS mutation undoable; Cmd+Z reverses | Task 2.3, gate 2-D |
| V8 | Multi-select destructive ops confirm once with count | Task 2.2 |

---

# Phase 1 — In-window metrics harness & baselines

## Goal

`pnpm perf` launches a **real VS Code window**, runs scripted scenarios against fixture workspaces, measures both CodeGraphy and the built-in Explorer in the same session, and writes deterministic JSON reports. Baselines committed, CI gate live. Every later phase's checkpoint is a number this harness prints.

## Ideas / approach

The end-user result is the only result: real extension host, real webview IPC, real disk, real rendering. `@vscode/test-electron` gives us a launchable, scriptable VS Code with our built VSIX/dev extension and a chosen workspace folder. Inside it, a hidden `codegraphy.perf.runScenario` command executes each scenario and streams timings through the existing diagnostics event system (`indexing/phase-completed` pattern in `packages/core/src/indexing/workspace/timing.ts`) to a JSON file the runner collects. The webview carries a lightweight rAF FPS + long-task sampler that reports back over the message bridge.

Because machines differ, we measure the **Explorer doing the same job in the same window** and gate on ratios: e.g. time a rename via CodeGraphy's action path vs `workspace.fs.rename` triggered as the Explorer would, file-watcher-to-UI latency for both. Ratios are portable; absolute numbers are recorded for trend lines but only gate on CI's own runner class. PR #294's numbers (warm Graph View startup 4,614ms on the monorepo — `docs/plans/2026-06-25-graph-cache-runtime-scheduler.md`) remain the historical anchor.

## Tasks

### Task 1.1: Deterministic fixture workspaces

**Packages:** repo root (`perf/`). **Vehicles:** unit.

Fixtures (seeded, zero randomness — file *i* imports files *i/2* and *i/3*): `small` 100 files · `medium` 1,000 · `large` 5,000 · `huge` 10,000 · `self` = the CodeGraphy monorepo.

- [ ] `perf/fixtures/generate.ts` + `manifest.json`; unit test: regenerate twice → identical tree hash. Commit.

### Task 1.2: In-window scenario runner

**Packages:** `extension` (perf command), `core` (metric events), `perf/`. **Vehicles:** in-window perf runs.

**Files:** Create `perf/run.ts` (launches VS Code via `@vscode/test-electron` per fixture), `packages/extension/src/extension/perf/scenarioCommand.ts` (hidden `codegraphy.perf.runScenario`), `packages/core/src/diagnostics/perfMetrics.ts` (event names + zod schemas), `perf/report.ts`. Modify emit sites: `core/src/indexing/engine.ts`, `extension/pipeline/service/refreshFacade.ts`, `extension/workspaceFiles/refresh/scheduler.ts`, `webview/store/messageHandlers/graphDataMessage/payload.ts`, `webview/components/graph/runtime/use/physics/hook/layout.ts`.

**Scenarios per fixture:** cold open (empty cache) · warm open · single-file save/rename/create/delete · 100-file batch change (scripted `git checkout` between two fixture branches) · graph pan/zoom/drag interaction burst.

**Metric keys (schema-enforced):** `coldOpenMs`, `warmOpenMs`, `incrementalRefreshMs`, `payloadBytes`, `watcherToGraphMs`, `fileOpRoundtripMs`, `layoutResets`, `cacheSaveMs`, `cacheBytes`, `treeSitterParseMs`, `graphBuildMs`.

- [ ] Implement runner + command + events; JSON report per fixture, schema-validated (missing key = failed run); `pnpm perf` wired. Commit.

### Task 1.3: Explorer comparison lane (same window)

**Packages:** `extension` (perf command), `perf/`. **Vehicles:** in-window perf runs.

In the same VS Code session, the scenario command times the built-in path for each comparable operation: `explorerRenameMs` (`workspace.fs.rename` + watcher round-trip to Explorer refresh), `explorerCreateMs`, `explorerDeleteMs`, `explorerRevealMs`. Report includes computed ratios: `renameRatio = fileOpRoundtripMs(rename) / explorerRenameMs`, etc.

- [ ] Implement comparison lane; every fixture report contains the 4 Explorer keys + 4 ratios. Commit.

### Task 1.4: Webview FPS/long-task sampler

**Packages:** `extension` (webview). **Vehicles:** in-window perf runs.

- [ ] `webview/perf/frameMetrics.ts`: rAF FPS + PerformanceObserver long-task counter, enabled only when the perf scenario command arms it via message; results returned over the bridge. Keys: `fpsIdle`, `fpsDrag`, `fpsSettle`, `longTasksPerInteraction`, `heapUsedBytes`. Sampler must be excluded from release bundles (verified in Phase 6). Commit.

### Task 1.5: Baselines + CI gate

**Packages:** repo root, CI. **Vehicles:** perf CI.

- [ ] Run `pnpm perf` 5× locally; commit median-per-key baselines to `perf/baselines/local-reference.json` (trend reference only).
- [ ] `.github/workflows/perf.yml`: xvfb + `@vscode/test-electron`, `small`+`medium` per PR, median of 3, fail >20% vs `perf/baselines/ci-<runner-class>.json`; full sweep on `workflow_dispatch`.
- [ ] Prove the gate: throwaway PR with `await sleep(500)` in `refreshFacade` goes red; revert. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 1-A | Fixture determinism | regenerate twice → **0** diff bytes |
| 1-B | Report completeness | **11 core + 5 webview + 4 Explorer-comparison keys + 4 ratios** present and schema-valid, exit 0 |
| 1-C | Stability | 5 runs on `medium`: CV **< 10%** per timing key; ratio keys CV **< 15%** |
| 1-D | Baselines | local-reference + CI-runner baselines committed |
| 1-E | Gate proven | perf CI green on no-op PR, red on the sleep-500 PR |

---

# Phase 2 — Explorer feature parity

## Goal

Every non-deferred row of the parity inventory lands as `done` (or stays `waived`), with acceptance tests asserting validation standards V1–V4, V7, V8.

## Ideas / approach

The inventory drives everything. All new FS mutations copy the existing action template (`extension/actions/deleteFiles.ts` + its dispatch wiring is the reference diff): `IUndoableAction`, zod-validated messages, `mutationAvailability` gating. Webview-side each action is a new `BuiltInContextMenuAction` member in `contextMenu/contracts.ts` plus entries-builder changes. No plugin-api changes expected.

## Tasks

### Task 2.1: Commit checklist + prove the `done`/`verify` rows

**Vehicles:** acceptance, Dev Host walkthrough.

- [ ] Copy inventory to `docs/plans/explorer-parity-checklist.md`; walk every `done` row in the Dev Host on `medium` (skill-assisted, screenshots); prove V3 nested-path create; fix or re-status failures; add missing acceptance scenarios; regression-check plugin menu entries. Commit.

### Task 2.2: Cut / Copy / Paste files

**Vehicles:** unit (collision naming), acceptance, Dev Host.

- [ ] Create `extension/actions/clipboardFiles.ts` — cut/copy/paste as `IUndoableAction`s; pure `resolveCollisionName(name, siblings)` helper implementing V4 exactly; V2 error shape. Wire `contracts.ts` (+`cutFiles`, `copyFiles`, `pasteFiles`), `node/entries.ts`, `node/folderEntries.ts`, `background/entries.ts`, `providerMessages/primaryActions/workspaceFileActions.ts`.
- [ ] Failing acceptance first: paste-duplicate ` copy`/` copy 2`; cut moves; 3-file multi-copy; V8 count-confirm; undo restores; disabled during Graph Revision browsing. Green → quality-tool loop → commit. Update Trello card.

### Task 2.3: Keyboard parity

**Vehicles:** unit (lookup), acceptance.

- [ ] `keyboard/command/lookup.ts`: `Delete`/`Cmd+Backspace` → delete (remove explicit `null`), `F2` → rename, `Cmd/Ctrl+C|X|V`, `Cmd/Ctrl+Enter` → open to side, `Cmd/Ctrl+Z`/`Shift+Z` → undo/redo through `undoManager` (new message). Escape-close-panels bug folded in. **No arrow keys.** Unit test per binding; all destructive bindings respect `mutationAvailability`. One commit per group.

### Task 2.4: Open variants, compare, terminal, close editor

**Vehicles:** acceptance, Dev Host.

- [ ] Open to the Side (`ViewColumn.Beside`) · Open With… · Open in Integrated Terminal (file's parent / folder) · Select for Compare + Compare with Selected (armed-state like Explorer) · Close open editor for node. One commit + Trello update each.

### Task 2.5: Find in Folder + files.exclude

**Vehicles:** unit (discovery), acceptance.

- [ ] Find in Folder… → `workbench.action.findInFiles` with `filesToInclude` preset.
- [ ] `files.exclude` read host-side → discovery exclusions (`core/src/discovery/`) → Graph Filters toggle (default on); excluded-count surfaces in the Filters button (links to the "Filters button reports 0" bug card; don't fix its plugin-defaults half here). Commit.

### Task 2.6: Auto-reveal active file

**Vehicles:** acceptance, Playwright (visual), Dev Host.

- [ ] Active-editor change → selected outline on the node (fixes bug card); `codegraphy.autoReveal` mirroring `explorer.autoReveal` (`true` = outline + pan, `focusNoScroll` = outline only, `false` = off). Commit.

### Task 2.7: Git + problems decorations

**Vehicles:** unit (mapping), Playwright (visual), Dev Host.

- [ ] Host side: `vscode.git` extension API for per-file status (fallback: `git status --porcelain` through core's existing git layer) + `vscode.languages.onDidChangeDiagnostics`; debounced, shipped as **in-place metric-style updates** (reuse `graphDataMessage/metricUpdates.ts` pattern — never a graph refresh).
- [ ] Webview: ring color per git status, error/warning badge per diagnostics — check react-force-graph `nodeCanvasObject` examples first (repo rule). Playwright visual test with mocked statuses. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 2-A | Inventory burn-down | **0 `todo(P2)`/`verify(P2)` rows** remain; waivers unchanged without owner sign-off |
| 2-B | Validation standards | passing named tests for **V1–V4, V7, V8** listed in the checklist |
| 2-C | Keyboard | **6 binding groups** in `lookup.ts` unit tests; `Delete` no longer `null`; 0 bindings bypass `mutationAvailability` |
| 2-D | Undo integrity | 100% of new `extension/actions/*.ts` implement `IUndoableAction` + undo acceptance test each |
| 2-E | No perf regression | perf CI green each PR; `renameRatio`/`createRatio`/`deleteRatio` on `medium` ≤ **2.0** even pre-optimization |
| 2-F | Plugin regression | plugin menu entry acceptance test green |
| 2-G | Dev Host walkthrough | every new action walked in a real window, screenshots attached, **0 failures** |
| 2-H | Quality-tool loop | every touched file: CRAP ≤ 8, scoped mutation clean, no over-threshold mutation-site counts |

---

# Phase 3 — Performance: pipeline + dependency maximization

## Goal

CodeGraphy updates like the Explorer tree: incremental, local, immediate — and we extract the maximum from each layer we build on (tree-sitter, ladybugdb, d3/react-force-graph, the VS Code webview bridge). Every task records before/after in-window numbers in its commit message.

## Ideas / approach

Two attack lines. **(1) Our pipeline:** stop shipping the whole graph over the bridge (generalize `metricUpdates.ts` into a diff protocol); stop resetting the layout on every structural change (`layoutKey.ts` joins every node+link id into a string per render and any change nukes the layout); apply file ops optimistically. **(2) The dependencies:** each library has headroom we don't currently use — tree-sitter's incremental re-parse, ladybugdb's patch writes off the interaction path, d3-force's tick/decay budget, react-force-graph's render-control props. Read each library's docs/examples before touching it (repo rule for react-force-graph; extend the courtesy to all of them).

## Tasks

### Task 3.1: Graph diff protocol

**Packages:** `core`, `extension` (both sides). **Vehicles:** unit (property test), in-window perf.

- [ ] `packages/core/src/graph/diff.ts`: `diffGraphData(prev, next)` → `{ addedNodes, removedNodeIds, updatedNodes, addedLinks, removedLinkIds }` + zod schema. Property test first: `apply(prev, diff(prev, next))` deep-equals `next` for fixture-derived pairs.
- [ ] `refreshFacade.ts`: incremental modes emit `GraphDataPatched`; full `GraphDataUpdated` only cold open/re-index. Webview `graphDataMessage/patch.ts` applies in place.
- [ ] Measure `payloadBytes` on `medium` single-file save in-window → commit with numbers.

### Task 3.2: Eliminate layout resets

**Packages:** `extension` (webview). **Vehicles:** unit, in-window perf, Playwright (position stability).

- [ ] Replace `layoutKey.ts`'s O(n) id-join with a `structureVersion` counter bumped only on membership change.
- [ ] `physics/hook/layout.ts`: on patch, mutate live graph data in place + local reheat (validate against react-force-graph's dynamic-data example first); full reset only on `GraphDataUpdated`. Fallback: preserve object identity for unchanged nodes so d3 keeps positions.
- [ ] Tests: `layoutResets` = 0 on single-file scenarios; untouched-node drift 0px pre-reheat. Commit with numbers.

### Task 3.3: Optimistic UI for file ops

**Packages:** `extension` (webview). **Vehicles:** unit, acceptance, in-window perf.

- [ ] `webview/store/optimistic.ts`: rename/delete/create apply synchronously with pending flag; reconcile on next patch; rollback + toast on failure. Commit with `fileOpRoundtripMs` + ratio before/after.

### Task 3.4: tree-sitter maximization

**Packages:** `core`. **Vehicles:** unit, in-window perf (`treeSitterParseMs`).

- [ ] **Incremental re-parse:** on file change, keep the previous `Tree`, apply `tree.edit()` with the change ranges, and pass the old tree to `parser.parse(newSource, oldTree)` — tree-sitter's core feature, currently unused if we re-parse from scratch (audit `core/src/treeSitter/runtime/analyze.ts` first; if we already do this, prove it with a benchmark and move on).
- [ ] **Parser/query reuse:** one parser + compiled `Query` per language held for the process lifetime (never re-create per file); language casts already centralized (`6d1d64d16`).
- [ ] **Parallel cold index:** worker pool (`worker_threads`, `os.cpus() - 1`) for the initial parse of independent files; keep single-threaded incremental path simple.
- [ ] Measure: `treeSitterParseMs` cold on `large`, incremental single-file on `medium`. Commit with numbers.

### Task 3.5: ladybugdb (Graph Cache) maximization

**Packages:** `core`, `extension` (pipeline service). **Vehicles:** unit, in-window perf (`cacheSaveMs`).

- [ ] **Patch, never full-save, on the hot path:** incremental changes go through `patchWorkspaceAnalysisDatabaseCache` exclusively; full `saveWorkspaceAnalysisDatabaseCache` only on re-index. Audit call sites; the PR #294 scheduler notes list the view-change paths that must not trigger saves at all.
- [ ] **Writes off the interaction path:** cache persistence scheduled idle-time (debounced, `saveAsync` path), never awaited by a user action; crash-safety via journaling what's pending.
- [ ] **Batch record writes:** group per-refresh record/relation writes into single transactions (audit `graphCache/database/io/save*.ts` + `records/`).
- [ ] Measure `cacheSaveMs`/`cacheBytes` on `medium` single-file change. Commit with numbers.

### Task 3.6: d3-force / react-force-graph maximization

**Packages:** `extension` (webview). **Vehicles:** in-window perf (FPS keys), Playwright visual.

- [ ] **Simulation budget:** tune `cooldownTicks`/`cooldownTime` + `d3AlphaDecay`/`d3VelocityDecay` so the sim *stops* after settling (a running sim burns CPU forever); `warmupTicks` to pre-settle off-screen on load; keep the tuned physics defaults (damping 0.7 etc.).
- [ ] **Pause when idle:** `autoPauseRedraw` (2D) confirmed on; pause simulation entirely when the panel is hidden (`onDidChangeViewState`) — currently refreshes are deferred when closed, but the sim/render loop while merely *unfocused* needs auditing.
- [ ] **Draw-cost audit:** profile `nodeCanvasObject` per-frame cost at 5k nodes; cache rendered node glyphs (offscreen canvas sprites keyed by node style) instead of re-drawing text/icons per frame; use `nodeCanvasObjectMode` and LOD — labels only above a zoom threshold (Explorer doesn't render what you can't read; neither should we).
- [ ] **3D:** verify three.js renderer reuses geometries/materials; sprite text (three-spritetext) cached per label.
- [ ] Measure `fpsIdle`/`fpsDrag`/`fpsSettle` + `longTasksPerInteraction` on `large` before/after each sub-item. Commit with numbers.

### Task 3.7: Bridge payload + watcher storms

**Packages:** `core` (wire format), `extension`. **Vehicles:** unit, in-window perf (batch scenario).

- [ ] Field-access-proxy test finds `IGraphData` fields the webview never reads; strip from wire format.
- [ ] `refresh/scheduler.ts`: adaptive coalescing — 32ms window widens to 250ms when >20 events pending; 100-file `git checkout` burst = **one** diff computation.
- [ ] Measure `watcherToGraphMs` single/batch. Commit with numbers.

## Checkpoints (deterministic — in-window `pnpm perf`, median of 5)

**Primary gates are Explorer ratios (machine-portable); absolute gates are machine-independent quantities or CI-runner-relative.**

| # | Gate | Fixture / scenario | Threshold |
| --- | --- | --- | --- |
| 3-A | Diff payload | `medium`, single-file save | `payloadBytes` ≤ **10 KB** and ≥ **95%** below Phase 1 baseline |
| 3-B | Zero resets | `medium` + `large`, all single-file scenarios | `layoutResets` = **0**; untouched-node drift **0px** pre-reheat |
| 3-C | Explorer ratios | `medium` | `renameRatio`, `createRatio`, `deleteRatio` ≤ **1.25** (CodeGraphy within 25% of Explorer in the same window); perceived optimistic update ≤ **1 frame (16ms)** |
| 3-D | Watcher latency | `medium`: 1 file / 100-file batch | `watcherToGraphMs` ≤ **1.5× Explorer's own refresh** for single file; batch ≤ **1,500ms** on the CI runner |
| 3-E | Warm startup | `self` | `warmOpenMs` ≥ **50% reduction** vs Phase 1 baseline *on the same machine* (historical anchor: 4,614ms in PR #294 notes) |
| 3-F | Frame rate | `large` | `fpsIdle` ≥ **55** with simulation **stopped** (0 ticks after settle), `fpsDrag` ≥ **30**, `longTasksPerInteraction` ≤ **2** |
| 3-G | Dependency wins | `medium`/`large` | `treeSitterParseMs` incremental ≤ **10%** of that file's cold parse; `cacheSaveMs` off the interaction path (blocking time in file-op scenarios = **0ms**) |
| 3-H | Memory | `huge` | `heapUsedBytes` ≤ **500 MB** |
| 3-I | No cold regression | `self` | `coldOpenMs` ≤ Phase 1 baseline **+10%** same machine |

Merge order: 3-A/3-B gate 3.1–3.2 · 3-C gates 3.3 · 3-G gates 3.4–3.5 · 3-F gates 3.6 · 3-D gates 3.7 · full sweep gates phase exit.

---

# Phase 4 — Feel & polish

## Goal

Interactions match Explorer conventions exactly — settings, dialogs, inline editing, loading states. Validation standards V5, V6 land here.

## Tasks

### Task 4.1: Honor Explorer settings for destructive ops

**Vehicles:** acceptance (on/off matrix), Dev Host.

- [ ] `deleteFiles.ts` → `vscode.workspace.fs.delete(uri, { useTrash })` per `files.enableTrash` (V5); confirm per `explorer.confirmDelete` with Explorer's exact wording incl. "You can restore this file from the Trash." and persistent "Do not ask me again" (V6). 8 scenarios: {confirmDelete, enableTrash} × {on, off} × single/multi. Commit.

### Task 4.2: Inline rename + inline new file/folder on canvas

**Vehicles:** acceptance, Playwright (overlay), Dev Host.

- [ ] HTML input overlay at node screen coords (`graph2ScreenCoords`); Enter commits, Escape cancels, blur commits; V1/V2 errors inline under the input exactly like Explorer's red message box. Ghost node + inline input for New File/Folder, replacing prompt flows. Commit.

### Task 4.3: Cold-open loading state

**Vehicles:** Playwright (pixel gate), in-window perf.

- [ ] Persist last session's node positions (webview `setState`); render dimmed ghost graph immediately on open until first data; swap without full re-layout. Pixel gate: non-blank canvas at t+100ms. Commit.

### Task 4.4: Dialog copy audit

**Vehicles:** unit (string table).

- [ ] Checklist table: every CodeGraphy dialog/toast string beside Explorer's (captured from a real VS Code instance); fix mismatches; unit test locks strings. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 4-A | Settings matrix | all **8** scenarios pass (V5, V6) |
| 4-B | Inline editing | rename + create with **0** focus departures from the webview; input visible ≤ **100ms**; V1/V2 inline errors asserted |
| 4-C | Cold-open feel | pixel gate green at **100ms**; `layoutResets` ≤ **1** on cold open |
| 4-D | Dialog copy | **0** unexplained mismatches |

---

# Phase 5 — Proof & showcase

## Goal

Publish concrete proof the epic delivered — in-window numbers, Explorer side-by-sides, recordings — where stakeholders look (epic PR + Trello). Owner validation here is the go-ahead for Phase 6.

## Tasks

- [ ] **5.1 Benchmark report:** full fixture sweep on final branch AND on the pre-epic baseline commit, same machine, same session methodology; `docs/perf/2026-explorer-parity-report.md` with per-metric before/after/ratio table (format of the PR #294 table); every Phase 3 gate listed with baseline → target → achieved. (Vehicles: in-window perf.)
- [ ] **5.2 Side-by-side session:** scripted run in ONE VS Code window doing each operation in the Explorer and then in CodeGraphy (rename, create nested, multi-delete+undo, 100-file checkout absorption), screen-recorded; the ratio table from the same session embedded next to the video. This is the "on your machine it's this close" artifact.
- [ ] **5.3 Demo recordings:** (1) file-management tour (create nested → inline rename → cut/paste → multi-delete → undo all), (2) snappiness reel (save with zero layout reset, optimistic rename, checkout absorbed as one patch), saved under `docs/assets/explorer-parity/`. (Vehicles: Playwright/screen recording.)
- [ ] **5.4 Publish:** upload media to the epic PR via the repo's Playwright PR-image workflow (`$PWCLI` GitHub profile flow); attach report + summary comment to the Trello epic; commit final checklist state; file the **drag & drop follow-up card** (deferred scope) linking back to the epic.
- [ ] **5.5 Owner validation:** owner reviews and signs off (comment on epic card) or files gap cards. **Phase 6 blocked until sign-off.** (Board rule: only the owner moves cards to Done.)

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 5-A | Report complete | all **9 Phase 3 gates + 2-A count** with achieved values; 0 below target (or owner-acknowledged exception inline) |
| 5-B | Side-by-side | 1 same-window Explorer-vs-CodeGraphy recording + same-session ratio table committed |
| 5-C | Demos + published | 2 recordings under `docs/assets/explorer-parity/`, PR comment with media live, Trello attachment live |
| 5-D | Follow-ups | drag & drop follow-up card filed and linked |
| 5-E | Sign-off | owner comment on epic card exists |

---

# Phase 6 — Cleanup & hardening (post-validation)

## Goal

Remove epic scaffolding; leave docs, suites, and baselines so the next contributor inherits none of the mess.

## Tasks

- [ ] **6.1 Dead code sweep:** perf sampler + scenario command tree-shaken out of release bundles (verify bundle diff); temporary flags/settings removed; superseded prompt-based rename/create flows deleted.
- [ ] **6.2 Quality-tool pass (scoped):** run the quality loop over the epic's hot modules — diff/apply, collision naming, optimistic store, scheduler — iterating (CRAP → scoped mutation → split-if-over-threshold → organization tool → re-run) until all outputs are clean. **No full-suite mutation run.** Dedupe acceptance scenarios overlapping the three pre-existing acceptance-test card suites.
- [ ] **6.3 Docs:** perf event catalog added to `docs/DIAGNOSTICS.md`; `docs/perf/README.md` (running `pnpm perf`, adding a metric, legitimately updating baselines, interpreting Explorer ratios); parity checklist marked maintenance-mode (new Explorer features in VS Code releases get a row).
- [ ] **6.4 Cross-package audit:** `pnpm build` + full test suites across `core`, `extension`, `cli`, `mcp`, all `plugin-*`; verify no core API drift; rebase perf baselines once, in a dedicated commit referencing the Phase 5 report.
- [ ] **6.5 Board hygiene:** completion comment on every linked child card (owner moves to Done); follow-up cards for every deferred/waived item that merits revisiting (drag epic, decorations-as-plugin-API if demand appears).

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 6-A | No scaffolding | grep for perf-command/sampler symbols in release bundle → **0 hits**; bundle size ≤ pre-epic **+5%** |
| 6-B | Quality loop done | hot modules: CRAP ≤ 8, **0 surviving mutants** in scoped runs, 0 files over the mutation-site threshold |
| 6-C | Docs | perf README + diagnostics catalog merged; checklist maintenance-mode |
| 6-D | Baselines rebased | single dedicated commit referencing the Phase 5 report |
| 6-E | Board | 100% of child cards commented; follow-up cards filed |

---

# Risks / open questions

- **In-window measurement variance:** real windows are noisier than harnesses — that's why gates use medians, CV limits (1-C), ratios against the Explorer in the same session, and CI-runner-class-scoped baselines. If CV can't get under 10% for a metric, fix the scenario (longer sampling, more repeats) before gating on it.
- **`@vscode/test-electron` + webview automation limits:** driving the webview's DOM from the test runner is restricted; the plan avoids needing it (scenario command + message bridge do the work). If a scenario truly needs DOM-level input, use VS Code's `--enable-proposed-api` automation or fall back to the Playwright visual harness for that assertion only — never for timing.
- **tree-sitter incremental parse** (3.4) may already be partially implemented — the task starts with an audit; don't rebuild what exists, benchmark it.
- **ladybugdb write scheduling** (3.5) interacts with the Graph Cache scheduler design notes (`docs/plans/2026-06-25-graph-cache-runtime-scheduler.md`) — read them first; this plan implements, not contradicts, those decisions.
- **In-place mutation of react-force-graph data** (3.2): validate against the library's dynamic-data example; fallback (object-identity preservation) documented in the task.
- **Git/diagnostics decoration APIs** (2.7): `vscode.git` API is semi-official; fallback to `git status --porcelain` through core's git layer.
- **Explorer ratio fairness:** the Explorer comparison lane times VS Code's own FS + refresh path; keep the measured spans honestly equivalent (user gesture → visible update on both sides) or the ratios become vanity numbers — the side-by-side recording in 5.2 is the honesty check.
