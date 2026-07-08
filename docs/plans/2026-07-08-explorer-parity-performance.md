# VS Code Explorer Parity + Native-Feel Performance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is written for handoff: an engineer with zero CodeGraphy context should be able to execute it top to bottom.

## Setup

- Trello epic: [Epic: VS Code Explorer parity + native-feel performance](https://trello.com/c/hmVekNGe)
- Linked child cards (absorbed by Phase 2/5): copy/paste, drag-to-folder move, open in terminal, compare selected, close open file, files.exclude toggle, external file drag, Explorer-equivalent context menus, Escape-close panels, active-editor outline, "Open in CodeGraphy" from Explorer
- Branch: `feat/explorer-parity-performance-plan`, base `main` at `6c5eb25a2`

**Goal:** Anything you can do in the built-in VS Code File Explorer, you can do from the CodeGraphy graph — with matching behavior, matching validation standards, and matching snappiness.

**Architecture:** Seven linear phases. Measurement comes first because every later gate is defined against recorded baselines. Parity work is driven by a committed inventory table (below) so "done" is countable, not vibes. Drag & drop is deliberately its own phase because its UX decisions (modifier keys vs plain drag) need dogfooding before they're locked. The epic ends with a proof/showcase phase and a cleanup phase that only runs after the proof has been validated by the project owner.

**Explicitly out of scope (owner decision, 2026-07-08):** arrow-key node navigation (waived — a force layout has no natural "next node"; existing search + type-to-find substitute covers keyboard reach).

**Tech Stack:** VS Code extension host (esbuild/CJS), React webview (Vite), react-force-graph-2d/3d, tree-sitter analysis in `packages/core`, ladybugdb Graph Cache, diagnostics event system (`packages/core/src/diagnostics/`, `docs/DIAGNOSTICS.md`), Vitest, Playwright.

## Phase map

| Phase | Name | Depends on | Exit gate summary |
| --- | --- | --- | --- |
| 1 | Metrics harness & baselines | — | `pnpm perf` deterministic, baselines committed, CI gate live |
| 2 | Explorer feature parity (non-drag) | 1 | Parity inventory: 0 `todo` rows outside Phase 5 scope |
| 3 | Performance work | 1 | All perf thresholds green vs Phase 1 baselines |
| 4 | Feel & polish | 2, 3 | Explorer-standard behavior gates green |
| 5 | Drag & drop (revisit) | 2, 4 | Drag decisions dogfooded + implemented or explicitly waived |
| 6 | Proof & showcase | 3, 4, 5 | Demo artifacts published on the epic PR + Trello |
| 7 | Cleanup & hardening | 6 validated by owner | Scaffolding removed, docs current, suites green |

## Monorepo package impact

| Package | Touched in | What changes |
| --- | --- | --- |
| `packages/core` | 1, 3 | Diff engine (`graph/diff.ts`), perf metric events, `files.exclude` respected in discovery (`core/src/discovery/`), no API breaks |
| `packages/extension` (extension host side) | 1–5, 7 | New FS actions in `extension/actions/` (clipboard, move), dispatch wiring in `graphView/webview/providerMessages/`, watcher/scheduler tuning, settings reads |
| `packages/extension` (webview side) | 1–6 | Context-menu entries, keyboard map, diff-apply store handler, optimistic layer, inline rename UI, decorations, perf samplers |
| `packages/plugin-api` | 2 (minor) | Only if a new context-menu contribution point is needed for decorations; otherwise **no changes** — parity actions are all built-ins, not plugin surface |
| `packages/plugin-*` | none | No behavior changes; plugin context-menu entries must continue to render (regression-tested in Phase 2 Task 2.1 and Phase 7) |
| `packages/cli` / `packages/mcp` | none | Untouched; Phase 7 verifies no accidental core API drift broke them (`pnpm build` + existing suites) |
| CI / repo root | 1, 6, 7 | `perf/` directory, `pnpm perf` script, `.github/workflows/perf.yml`, demo assets under `docs/assets/` |

Rule for executors: if a task forces a change outside its listed packages, stop and flag it on the epic card before proceeding — that is a scope signal, not a detail.

## Testing strategy (applies to every phase)

Each layer of the stack has a designated test vehicle. Every task below names which vehicles it uses.

1. **Unit tests (Vitest)** — pure logic: diff/apply, name-collision resolution, keyboard lookup, menu entry builders. Location mirrors source (`*.test.ts` next to file). ResizeObserver mock and react-force-graph mocks already exist in `tests/setup.ts` and `tests/__mocks__/`.
2. **Acceptance scenarios** — required by the repo's development workflow for every user-visible behavior. Given/When/Then style like the existing acceptance suites (see the three "Acceptance tests" Trello cards / existing acceptance test files). Each parity inventory row that lands must add ≥1 scenario.
3. **Playwright webview harness** — real rendering checks (FPS, pixel gates, inline rename overlay, decorations). Reuses the documented screenshot workflow: `pnpm run build:webview` → `dist/webview/screenshot.html` mocking `acquireVsCodeApi()` → serve over HTTP (`python3 -m http.server 8765`; `file://` is blocked) → inject fixture graph via `window.postMessage` (`GRAPH_DATA_UPDATED`, then `TIMELINE_DATA` after 500ms). Phase 1 Task 1.3 turns this manual workflow into a scripted `perf/webview.spec.ts` + `tests/e2e/` home.
4. **Extension Development Host smoke (skill-assisted)** — after each phase, run the extension for real in VS Code's Extension Development Host against the `medium` fixture workspace and walk the phase's acceptance checklist by hand or via the `verify` / `run` skills (agent drives the flow end-to-end and screenshots evidence). This is the only vehicle that catches extension-host↔webview wiring issues the mocked harness can't.
5. **Perf CI** — `.github/workflows/perf.yml` from Phase 1 runs `small` + `medium` fixtures on every PR; median of 3 runs; fails at >20% regression vs committed baselines. Full fixture sweep (`large`, `huge`, `self`) runs on-demand via workflow_dispatch and before each phase-exit gate.
6. **Repo workflow gates** — every PR: CRAP ≤ 8 on new/modified functions, differential mutation testing on changed code, existing unit + acceptance suites green.

---

## Explorer parity inventory (source of truth)

This table is the double-checked enumeration of the built-in Explorer's user-facing surface. It gets committed as `docs/plans/explorer-parity-checklist.md` in Phase 2 Task 2.1 and updated as rows land. Gate 2-A counts rows in this table, so additions/waivers must be edited here, in one reviewable place.

**Status legend:** `done` = works in CodeGraphy today (per 2026-07-08 code audit) · `todo(P#)` = planned, phase # · `waived` = deliberately not doing, reason given.

### Context menu — file

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| Open | done | `node-open`, incl. multi-select "Open N Files" |
| Open to the Side | todo(P2) | Task 2.4 |
| Open With… | todo(P2) | Task 2.4 |
| Reveal in Finder/Explorer | done | `node-reveal` |
| Open in Integrated Terminal | todo(P2) | Task 2.4 (existing Trello card) |
| Select for Compare / Compare with Selected | todo(P2) | Task 2.4 (existing Trello card) |
| Open Timeline | waived | CodeGraphy has its own timeline/Graph Revision view; duplicating VS Code's Timeline panel adds nothing |
| Cut / Copy / Paste | todo(P2) | Task 2.2 |
| Copy Path / Copy Relative Path | done | `node-copy-absolute` / `node-copy-relative` |
| Rename | done | single-select, prompt-based; inline editing upgraded in Phase 4 |
| Delete (to trash) | partial → todo(P4) | delete+undo exists; trash + `explorer.confirmDelete` semantics in Task 4.1 |
| Share (Copy vscode.dev Link) | waived | web-only/marginal |

### Context menu — folder

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| New File / New Folder | done | folder + background menus |
| New nested path (`a/b/c.ts` creates folders) | verify(P2) | `extension/actions/createPath.ts` exists — Task 2.1 verifies + adds acceptance test |
| Find in Folder… | todo(P2) | Task 2.5 — opens VS Code search scoped to the folder |
| Paste | todo(P2) | Task 2.2 |
| Reveal / Copy paths / Rename / Delete | done | root `(root)` correctly protected |
| Open in Integrated Terminal | todo(P2) | Task 2.4 |

### Keyboard (Explorer defaults, adapted to the graph)

| Explorer binding | Status | Notes / task |
| --- | --- | --- |
| Enter (mac: open; win: rename) → CodeGraphy: Enter = open | done | keep Enter=open on all platforms (graph convention), F2 = rename everywhere |
| F2 rename | todo(P2) | Task 2.3 |
| Delete / Cmd+Backspace delete | todo(P2) | Task 2.3 — currently explicitly mapped to `null` in `keyboard/command/lookup.ts` |
| Cmd/Ctrl+C, X, V | todo(P2) | Task 2.3 |
| Cmd/Ctrl+Enter open to side | todo(P2) | Task 2.3 |
| Cmd/Ctrl+A select all | done | |
| Escape clear selection | done | also fold in "Escape closes CodeGraphy panels" bug card here |
| Cmd/Ctrl+Z / Shift+Z undo/redo file ops | todo(P2) | Task 2.3 — `undoManager` exists on the extension side; needs keyboard reach from the webview |
| Type-ahead find (typing jumps to file) | waived | CodeGraphy's search bar covers this better in a graph; documented substitute |
| Arrow-key navigation | **waived (owner)** | no natural "next node" on a force layout; search substitutes |
| Left/Right collapse/expand folder | waived | folderView expand/collapse via click is the graph-native equivalent |

### Behaviors & display

| Explorer feature | Status | Notes / task |
| --- | --- | --- |
| Multi-select (click modifiers + range) | done | marquee + additive toggle; richer than Explorer |
| Auto-reveal active file (`explorer.autoReveal`) | todo(P2) | Task 2.6 — fixes the "active editor outline" bug card; selected outline + optional pan-to-node |
| Git status decorations (M/A/U colors, badge) | todo(P2) | Task 2.7 — node ring/badge colored like Explorer's `gitDecorations` |
| Problems decorations (error/warning badge + color) | todo(P2) | Task 2.7 |
| `files.exclude` respected | todo(P2) | Task 2.5 (existing Trello card) |
| File nesting (`explorer.fileNesting`) | waived | nesting is a tree concept; graph edges already express the relationships |
| Open Editors section | waived | editor management, not file management |
| Sort order settings | waived | graph layout ≠ list order; physics/folderView own arrangement |
| Drag: move file, Alt-drag copy, external drop-in, drag-out to editor | todo(P5) | entire drag surface deferred to Phase 5 by owner decision |
| Inline input box for new/rename (not modal prompt) | todo(P4) | Task 4.2 |
| Delete to OS trash by default (`files.enableTrash`) | todo(P4) | Task 4.1 |

### Validation standards (Explorer's rules, adopted as CodeGraphy's gates)

These are the behaviors VS Code's Explorer enforces; Phase 2/4 acceptance tests must assert the **same** rules so validation parity is testable, not aspirational:

| # | Explorer standard | Where enforced |
| --- | --- | --- |
| V1 | Rename/new rejects empty names and names that are only whitespace | Task 2.3/4.2 tests |
| V2 | Rename/new to an existing name fails with "A file or folder **{name}** already exists at this location." (same message shape) | Task 2.2/4.2 |
| V3 | Names containing path separators in New File create nested folders (Explorer behavior), never error | Task 2.1 verify |
| V4 | Paste collision appends ` copy`, then ` copy 2`, ` copy 3`… (exact Explorer suffix scheme) | Task 2.2 unit tests |
| V5 | Delete goes to OS trash when `files.enableTrash` is true; permanent delete warns with Explorer's wording | Task 4.1 |
| V6 | `explorer.confirmDelete` / `explorer.confirmDragAndDrop` honored, including "Do not ask me again" persistence | Task 4.1 / Phase 5 |
| V7 | Every FS mutation is undoable and Cmd+Z reverses it (Explorer's local undo stack semantics) | Task 2.3, gate 2-D |
| V8 | Multi-select destructive ops confirm once with a count ("Are you sure you want to delete the 3 selected files?") | Task 2.2 |

---

# Phase 1 — Metrics harness & baselines

## Goal

A deterministic `pnpm perf` harness producing JSON metric reports on fixed fixtures, committed baselines, and a CI regression gate. Every later phase's checkpoint is a number this harness prints.

## Ideas / approach

Reuse what exists instead of inventing: the diagnostics event system already emits `indexing/phase-completed` with `durationMs` (`packages/core/src/indexing/workspace/timing.ts`); the PR #294 benchmark proved the monorepo-as-fixture approach and left us anchor numbers (warm Graph View startup 4,614ms, Visible Graph projection 12ms — see `docs/plans/2026-06-25-graph-cache-runtime-scheduler.md`). The harness = fixtures + scenario driver + report writer + CI wrapper. Determinism is the whole game: seeded fixtures, no random data, medians over repeats.

## Tasks

### Task 1.1: Deterministic fixture workspaces

**Packages:** repo root (`perf/`). **Test vehicles:** unit.

**Files:** Create `perf/fixtures/generate.ts`, `perf/fixtures/manifest.json`, `perf/fixtures/generate.test.ts`.

| Fixture | Files | Content |
| --- | ---: | --- |
| `small` | 100 | TS with import chains |
| `medium` | 1,000 | TS, folders 4 deep |
| `large` | 5,000 | mixed TS/Python/Markdown |
| `huge` | 10,000 | stress |
| `self` | repo | CodeGraphy monorepo, real-world anchor |

- [ ] Generator derives every file and import edge from index arithmetic (file *i* imports *i/2*, *i/3*) — zero randomness.
- [ ] Unit test: generating a fixture twice → identical tree hash.
- [ ] Commit.

### Task 1.2: Core/extension metric events + scenario driver

**Packages:** `core`, `extension`, `perf/`. **Test vehicles:** unit + schema validation.

**Files:** Create `packages/core/src/diagnostics/perfMetrics.ts` (event names + zod schemas), `perf/run.ts`, `perf/report.ts`. Modify emit sites: `core/src/indexing/engine.ts` (cold/warm/incremental), `extension/pipeline/service/refreshFacade.ts` (payload size), `extension/workspaceFiles/refresh/scheduler.ts` (watcher latency), `webview/store/messageHandlers/graphDataMessage/payload.ts` (apply timing), `webview/components/graph/runtime/use/physics/hook/layout.ts` (layout-reset counter).

**Metric keys (exact, schema-enforced):** `coldOpenMs`, `warmOpenMs`, `incrementalRefreshMs`, `payloadBytes`, `watcherToGraphMs`, `fileOpRoundtripMs`, `layoutResets`, `cacheSaveMs`, `cacheBytes`.

**Scenarios per fixture:** cold open · warm open · single-file save · single-file rename · single-file create · single-file delete · 100-file batch change (simulated git checkout).

- [ ] Emit events; drive scenarios headlessly (core engine + jsdom-hosted webview store); write one schema-validated JSON per fixture (missing key = run fails).
- [ ] Wire `pnpm perf` at repo root. Commit.

### Task 1.3: Webview rendering metrics (Playwright)

**Packages:** `extension` (webview), `perf/`. **Test vehicles:** Playwright.

**Files:** Create `packages/extension/src/webview/perf/frameMetrics.ts` (rAF FPS sampler + PerformanceObserver long-task counter behind `?perf=1`), `perf/webview.spec.ts`, and promote the manual screenshot workflow into a reusable scripted harness under `tests/e2e/harness/` (build webview → `screenshot.html` with `acquireVsCodeApi` mock → HTTP server → `postMessage` fixture injection).

**Keys:** `fpsIdle`, `fpsDrag`, `fpsSettle`, `longTasksPerInteraction`, `heapUsedBytes`, exposed on `window.__codegraphyPerf`.

- [ ] Scenarios on `medium` + `large`: 5s idle, 5s programmatic drag, layout settle. Commit.

### Task 1.4: Baselines + CI gate

**Packages:** repo root, CI. **Test vehicles:** perf CI.

- [ ] Run `pnpm perf` 5×, commit median-per-key baselines to `perf/baselines/*.json`.
- [ ] `.github/workflows/perf.yml`: PRs run `small`+`medium`, median of 3, fail >20% vs baseline; `workflow_dispatch` runs the full sweep.
- [ ] Verify the gate works: one throwaway PR with `await sleep(500)` in `refreshFacade` must go red; revert. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 1-A | Fixture determinism | regenerate twice → **0** diff bytes |
| 1-B | Report completeness | all **9 core + 5 webview keys** present, schema-valid, exit 0 |
| 1-C | Stability | 5 runs on `medium`: CV **< 10%** per timing key |
| 1-D | Baselines | one JSON per fixture committed and referenced by CI |
| 1-E | Gate proven | perf CI green on no-op PR, red on the sleep-500 PR |

---

# Phase 2 — Explorer feature parity (non-drag)

## Goal

Every non-drag row of the parity inventory lands as `done` (or stays `waived`), with acceptance tests asserting the Explorer validation standards V1–V4, V7, V8.

## Ideas / approach

The inventory table drives everything: Task 2.1 commits it as a living checklist, and each subsequent task burns down named rows. All new FS mutations copy the existing action pattern (`extension/actions/*.ts`, `IUndoableAction`, dispatch through `providerMessages/primaryActions/`), so an executor can diff `deleteFiles.ts` + its wiring as the template. Webview-side, every action is a new `BuiltInContextMenuAction` union member in `contextMenu/contracts.ts` plus an entries-builder change — zod-validate the new messages like the existing ones. No plugin-api changes needed for this phase.

## Tasks

### Task 2.1: Commit the parity checklist + verify "already done" claims

**Packages:** docs. **Test vehicles:** acceptance (spot-check), Extension Dev Host smoke.

- [ ] Copy the inventory above into `docs/plans/explorer-parity-checklist.md`.
- [ ] Verify each `done` row actually works in the Extension Development Host on the `medium` fixture (skill-assisted walk: open, reveal, copy paths, rename, delete+undo, new file/folder, nested-path create V3). Fix or re-status any row that fails; add missing acceptance scenarios for `done` rows lacking them.
- [ ] Regression-check plugin-contributed menu entries still render. Commit.

### Task 2.2: Cut / Copy / Paste files

**Packages:** `extension` (both sides). **Test vehicles:** unit (collision naming), acceptance, Dev Host smoke.

**Files:** Create `packages/extension/src/extension/actions/clipboardFiles.ts` (cut/copy/paste as `IUndoableAction`s; V4 ` copy`/` copy N` suffix scheme in a pure, unit-tested `resolveCollisionName(name, siblings)` helper; V2 error message shape). Modify `contextMenu/contracts.ts` (+`cutFiles`, `copyFiles`, `pasteFiles`), `contextMenu/node/entries.ts`, `node/folderEntries.ts`, `background/entries.ts`, dispatch in `providerMessages/primaryActions/workspaceFileActions.ts`.

- [ ] Failing acceptance scenarios: copy→paste same folder duplicates with ` copy` suffix; second paste → ` copy 2`; cut→paste moves; multi-select copy of 3 files; V8 count-confirm on multi-delete already covered — mirror for cut; undo restores; paste disabled while browsing Graph Revision (`mutationAvailability`).
- [ ] Implement → green → commit. Mark inventory rows. Update linked Trello card.

### Task 2.3: Keyboard parity

**Packages:** `extension` (webview). **Test vehicles:** unit (lookup table), acceptance.

**Files:** Modify `webview/components/graph/keyboard/command/lookup.ts`.

Bindings: `Delete`/`Cmd+Backspace` → delete selected (remove the explicit `null`), `F2` → rename, `Cmd/Ctrl+C|X|V` → clipboard actions, `Cmd/Ctrl+Enter` → open to side, `Cmd/Ctrl+Z`/`Cmd/Ctrl+Shift+Z` → undo/redo via `undoManager` (new webview→extension message). **No arrow-key navigation (waived).**

- [ ] Unit tests: each binding resolves to the right action; all destructive bindings respect `mutationAvailability`. One commit per binding group.

### Task 2.4: Open variants, compare, terminal, close editor

**Packages:** `extension` (both sides). **Test vehicles:** acceptance, Dev Host smoke.

Actions (each its own commit + Trello card update): Open to the Side (`ViewColumn.Beside`), Open With… (`vscode.commands.executeCommand('explorer.openWith')` equivalent), Open in Integrated Terminal (file's parent / folder itself), Select for Compare + Compare with Selected (second entry only appears when a compare source is armed — same statefulness as Explorer), Close open editor for selected node.

- [ ] Implement with acceptance scenarios per action.

### Task 2.5: Find in Folder + files.exclude toggle

**Packages:** `core` (discovery), `extension`. **Test vehicles:** unit (discovery filter), acceptance.

- [ ] Find in Folder…: folder context entry → `workbench.action.findInFiles` with `filesToInclude` preset to the folder's relative path.
- [ ] `files.exclude`: read the setting extension-side, pass into discovery exclusions (`core/src/discovery/`), surface an on/off toggle in the Graph Filters panel (default on, matching Explorer). Excluded-count in the Filters button must include these (touches the "Filters button reports 0" bug card — link, don't fix that card's plugin-defaults half here).
- [ ] Commit; update Trello cards.

### Task 2.6: Auto-reveal active file

**Packages:** `extension` (both sides). **Test vehicles:** acceptance, Playwright (outline visual), Dev Host smoke.

- [ ] Active editor change → message → node gets the selected outline (fixes the linked bug card); add `codegraphy.autoReveal` setting mirroring `explorer.autoReveal` values (`true`/`false`/`focusNoScroll` → outline + pan / outline only).
- [ ] Commit.

### Task 2.7: Git + problems decorations

**Packages:** `extension` (both sides), possibly `plugin-api` (only if decorations become a contribution point — default: built-in, no API change). **Test vehicles:** unit (decoration mapping), Playwright (visual), Dev Host smoke.

- [ ] Extension side: subscribe to `vscode.extensions.getExtension('vscode.git')` API for per-file status + `vscode.languages.onDidChangeDiagnostics` for problems; debounce and send as **metric-style in-place updates** (reuse `graphDataMessage/metricUpdates.ts` pattern — do NOT trigger graph refreshes).
- [ ] Webview side: node ring color for git status (modified=Explorer's `gitDecoration.modifiedResourceForeground` semantic, untracked=green, deleted=strikethrough label), error/warning badge dot for diagnostics. Check react-force-graph `nodeCanvasObject` examples before implementing (repo rule).
- [ ] Playwright visual test with injected mock statuses. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 2-A | Inventory burn-down | checklist has **0 `todo(P2)` / `verify(P2)` rows** remaining; waivers unchanged without owner sign-off |
| 2-B | Validation standards | acceptance suite includes passing tests for **V1, V2, V3, V4, V7, V8** (named test IDs in the checklist) |
| 2-C | Keyboard | **6 binding groups** resolve in `lookup.ts` unit tests; `Delete` no longer `null`; 0 bindings bypass `mutationAvailability` |
| 2-D | Undo integrity | 100% of new `extension/actions/*.ts` implement `IUndoableAction` (grep-countable) + each has an undo acceptance test |
| 2-E | No perf regression | perf CI green on every parity PR; `fileOpRoundtripMs` on `medium` ≤ **200ms** pre-optimization |
| 2-F | Plugin regression | plugin-contributed menu entry acceptance test still green |
| 2-G | Dev Host smoke | skill-assisted walkthrough of every new action recorded (checklist ticked + screenshots) with **0 failures** |

---

# Phase 3 — Performance work

## Goal

Graph updates become incremental, local, and immediate — Explorer-tree-like. Every task measures before/after against Phase 1 baselines and puts the numbers in its commit message.

## Ideas / approach

Highest-leverage first: (1) stop shipping the whole graph over the bridge on every refresh — generalize the existing `metricUpdates.ts` in-place patch into a full diff protocol; (2) stop resetting the physics layout on every structural change — `layoutKey.ts` currently joins *every* node+link id into one string per render and any change nukes the layout; (3) make file ops apply optimistically in the store so perceived latency is one frame; (4) trim payloads and survive watcher storms. The core diff work lives in `packages/core` so CLI/MCP consumers can eventually use it too, but only extension/webview consume it in this phase.

## Tasks

### Task 3.1: Graph diff protocol

**Packages:** `core`, `extension` (both sides). **Test vehicles:** unit (property test), perf harness.

**Files:** Create `packages/core/src/graph/diff.ts` — `diffGraphData(prev, next)` → `{ addedNodes, removedNodeIds, updatedNodes, addedLinks, removedLinkIds }` + zod schema. Modify `extension/pipeline/service/refreshFacade.ts` (incremental modes emit `GraphDataPatched`; full `GraphDataUpdated` only for cold open/re-index), `webview/store/messageHandlers/graphDataMessage/` (new `patch.ts` applying diffs in place, generalizing `metricUpdates.ts`).

- [ ] Property test first: for fixture-derived (prev, next) pairs, `apply(prev, diff(prev, next))` deep-equals `next`.
- [ ] Implement; measure `payloadBytes` on `medium` single-file save; commit with before/after numbers.

### Task 3.2: Eliminate unnecessary layout resets

**Packages:** `extension` (webview). **Test vehicles:** unit, perf harness, Playwright (position stability).

**Files:** Modify `webview/components/graph/view/layoutKey.ts` (replace O(n) id-join with a `structureVersion` counter bumped only on membership change), `runtime/use/physics/hook/layout.ts` (on patch: mutate live graph data in place + local reheat — verify against react-force-graph's official dynamic-data example first; full reset only on `GraphDataUpdated`).

- [ ] Tests: `layoutResets` = 0 across single-file scenarios; untouched-node positions identical pre/post patch (before reheat).
- [ ] Fallback if in-place mutation misbehaves in `^1.29.1`: preserve object identity for unchanged nodes across replaces so the sim keeps positions. Commit with numbers.

### Task 3.3: Optimistic UI for file ops

**Packages:** `extension` (webview). **Test vehicles:** unit, acceptance, perf harness.

**Files:** Create `webview/store/optimistic.ts` — apply rename/delete/create/move to the store synchronously with a pending flag; reconcile on next `GraphDataPatched`; roll back + error toast on action-failure message.

- [ ] Acceptance: rename label updates same tick; failure rolls back. Commit with `fileOpRoundtripMs` before/after.

### Task 3.4: Payload trimming + watcher-storm batching

**Packages:** `core` (serialization boundary), `extension`. **Test vehicles:** unit, perf harness (batch scenario).

- [ ] Field-access-proxy test to find `IGraphData` fields the webview never reads; strip from the wire format (keep core types intact).
- [ ] `refresh/scheduler.ts`: adaptive coalescing — 32ms window widens to 250ms when >20 watcher events are pending; 100-file burst produces **one** diff computation.
- [ ] Commit with `watcherToGraphMs` batch numbers.

## Checkpoints (deterministic — `pnpm perf`, median of 5, vs Phase 1 baselines)

| # | Gate | Fixture / scenario | Threshold |
| --- | --- | --- | --- |
| 3-A | Diff payload | `medium`, single-file save | `payloadBytes` ≤ **10 KB** and ≥ **95%** below baseline |
| 3-B | Zero resets | `medium` + `large`, all single-file scenarios | `layoutResets` = **0**; untouched-node drift **0px** pre-reheat |
| 3-C | Optimistic latency | `medium` | perceived `fileOpRoundtripMs` ≤ **50ms**; reconciled ≤ **250ms** |
| 3-D | Watcher latency | `medium`: 1 file / 100-file batch | ≤ **250ms** / ≤ **1,500ms** |
| 3-E | Warm startup | `self` | `warmOpenMs` ≤ **2,000ms** (anchor: 4,614ms in PR #294 notes) |
| 3-F | Frame rate | `large` | `fpsIdle` ≥ **55**, `fpsDrag` ≥ **30**, `longTasksPerInteraction` ≤ **2** |
| 3-G | Memory | `huge` | `heapUsedBytes` ≤ **500 MB** |
| 3-H | No cold regression | `self` | `coldOpenMs` ≤ baseline **+10%** |

Merge order: 3-A/3-B gate Tasks 3.1–3.2; 3-C gates 3.3; 3-D gates 3.4; 3-E→3-H gate phase exit (full fixture sweep via workflow_dispatch).

---

# Phase 4 — Feel & polish

## Goal

Interactions match Explorer conventions *exactly* — settings, dialogs, inline editing, loading states — so nothing feels "webview-ish". This is where validation standards V5, V6 land.

## Ideas / approach

Read Explorer behavior as spec: every dialog string, setting interaction, and edit affordance gets audited against a real VS Code instance and recorded in the checklist so mismatches are countable. Inline rename is the single biggest "feels native" win — Explorer never opens a modal for rename, and currently CodeGraphy does.

## Tasks

### Task 4.1: Honor Explorer settings for destructive ops

**Packages:** `extension` (host side). **Test vehicles:** acceptance (on/off matrix), Dev Host smoke.

- [ ] `deleteFiles.ts`: route through `vscode.workspace.fs.delete(uri, { useTrash })` per `files.enableTrash` (V5); confirm dialog per `explorer.confirmDelete` with Explorer's exact wording incl. "You can restore this file from the Trash." and a working "Do not ask me again" (persists the setting) (V6).
- [ ] 8 acceptance scenarios: {confirmDelete, enableTrash} × {on, off} × single/multi. Commit.

### Task 4.2: Inline rename + inline new file/folder on the canvas

**Packages:** `extension` (webview). **Test vehicles:** acceptance, Playwright (overlay position/focus).

- [ ] HTML input overlay positioned at node screen coords (graph→screen transform from react-force-graph's `graph2ScreenCoords`); Enter commits, Escape cancels, blur commits (Explorer behavior); V1/V2 validation errors shown inline under the input exactly like Explorer's red message box.
- [ ] Same affordance for New File/New Folder (ghost node + inline input) replacing prompt flow. Commit.

### Task 4.3: Cold-open loading state

**Packages:** `extension` (webview). **Test vehicles:** Playwright (pixel gate).

- [ ] Persist last session's node positions (webview `setState`); on cold open render them immediately as dimmed ghost nodes until first `GraphDataUpdated`; swap without full re-layout.
- [ ] Playwright: at t+100ms canvas non-blank (>1% pixels differ from blank frame). Commit.

### Task 4.4: Dialog copy audit

**Packages:** docs + string fixes. **Test vehicles:** unit (string table).

- [ ] Table in the checklist: every CodeGraphy dialog/toast string beside Explorer's equivalent (captured from a real VS Code instance); fix mismatches; unit test locks the strings. Commit.

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 4-A | Settings matrix | all **8** on/off acceptance scenarios pass (V5, V6) |
| 4-B | Inline editing | rename + create complete with **0** focus departures from the webview; input visible ≤ **100ms** after trigger; V1/V2 inline errors asserted |
| 4-C | Cold-open feel | pixel gate green at **100ms**; `layoutResets` ≤ **1** on cold open |
| 4-D | Dialog copy | **0** unexplained mismatches in the string table |

---

# Phase 5 — Drag & drop (revisit)

## Goal

Settle the drag UX questions deliberately — then implement file-move drag, Alt-drag copy, external drop-in, and drag-out, or waive rows with recorded reasons. Deferred from Phase 2 by owner decision so plain-drag-repositions-nodes muscle memory isn't broken casually.

## Ideas / approach

The tension: in Explorer, drag *is* move; in CodeGraphy, drag is layout. Options to dogfood before committing: (a) modifier drag (Shift/Cmd) = file move, plain = layout; (b) drag onto a folder node with a hover-dwell (400ms) arms "move" with a visual drop-ring; (c) explicit "move mode" toggle in the toolbar. Prototype (a) and (b) behind a setting, dogfood a week in the team's daily driver, pick one, delete the other.

## Tasks

- [ ] **5.1 Decision spike:** implement (a) and (b) minimally behind `codegraphy.experimental.dragMode`; dogfood ≥5 working days on `self`; record the decision + rationale in the checklist. (Vehicles: Dev Host dogfood, skill-assisted walkthrough.)
- [ ] **5.2 File-move drag:** chosen interaction + `extension/actions/moveFiles.ts` (`IUndoableAction`, honors `explorer.confirmDragAndDrop` V6, no-op with notice on self/descendant drop); edges re-resolve via the Phase 3 diff path — a moved file must arrive as a patch, not a full refresh. (Vehicles: unit, acceptance, perf harness.)
- [ ] **5.3 Alt-drag copy** (Explorer's Option/Alt semantics) reusing `clipboardFiles` copy machinery + V4 collision naming. (Vehicles: acceptance.)
- [ ] **5.4 External OS drop-in:** files dropped on the canvas copy into the drop-target folder (background = workspace root). (Vehicles: acceptance, Dev Host smoke.)
- [ ] **5.5 Drag-out to editor:** node dragged to the editor area opens the file (VS Code webview drag-out constraints permitting — if the platform blocks it, waive with the constraint documented). (Vehicles: Dev Host smoke.)

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 5-A | Decision recorded | checklist contains the chosen drag mode + dated rationale; losing prototype deleted (grep: `experimental.dragMode` gone) |
| 5-B | Inventory burn-down | **0 `todo(P5)` rows** remaining (implemented or waived with reason) |
| 5-C | Move correctness | move file acceptance suite: drop→move→edges re-resolved via patch (`payloadBytes` ≤ 10 KB for the move), undo returns file, **0** layout resets |
| 5-D | No regression | perf CI green; plain drag still repositions nodes (existing drag acceptance tests untouched and green) |

---

# Phase 6 — Proof & showcase

## Goal

Publish concrete, reviewable proof that the epic delivered: side-by-side demos, before/after numbers, and artifacts attached where stakeholders look (epic PR + Trello). This is the validation input for Phase 7's go-ahead.

## Tasks

- [ ] **6.1 Benchmark report:** run the full fixture sweep on the final branch and on the pre-epic baseline commit; generate `docs/perf/2026-explorer-parity-report.md` with a per-metric before/after table (same format as the PR #294 table in `docs/plans/2026-06-25-graph-cache-runtime-scheduler.md`) — every Phase 3 gate listed with baseline, target, achieved. (Vehicles: perf harness.)
- [ ] **6.2 Demo recordings:** Playwright-scripted recordings on the `medium` fixture — (1) full file-management tour: create nested path, rename inline, cut/paste, multi-delete, undo all; (2) snappiness reel: file save with zero layout reset, optimistic rename, 100-file git checkout absorbed as one patch; (3) side-by-side split with the built-in Explorer doing the same operations. Save GIFs/MP4s under `docs/assets/explorer-parity/`. (Vehicles: Playwright harness + screen recording.)
- [ ] **6.3 Publish:** upload screenshots/recordings to the epic PR using the repo's Playwright PR-image workflow (`$PWCLI` GitHub profile flow from CLAUDE.md); attach the report + a summary comment to the Trello epic card; final checklist state committed.
- [ ] **6.4 Owner validation:** owner reviews artifacts and either signs off (comment on the epic card) or files gap cards. **Phase 7 does not start until sign-off exists.** (Per board rules, only the owner moves cards to Done.)

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 6-A | Report complete | report lists **all 8 Phase 3 gates + 2-A/5-B counts** with achieved values; 0 gates below target (or an owner-acknowledged exception noted inline) |
| 6-B | Demos exist | **3** recordings committed under `docs/assets/explorer-parity/` and embedded in the PR |
| 6-C | Published | PR comment with media + Trello attachment both live (URLs recorded in the report) |
| 6-D | Sign-off | owner comment on the epic card exists |

---

# Phase 7 — Cleanup & hardening (post-validation)

## Goal

Remove the scaffolding the epic accumulated, leave docs and suites in a state where the next contributor inherits none of the mess.

## Tasks

- [ ] **7.1 Dead code sweep:** remove the losing drag prototype remnants, any `?perf=1`-only code paths that leaked into production bundles (perf sampler must be tree-shaken out of the release build — verify bundle diff), temporary feature flags/settings introduced during the epic; delete superseded prompt-based rename/create flows.
- [ ] **7.2 Suite consolidation:** dedupe acceptance scenarios that overlap between phases; ensure the three pre-existing "Acceptance tests" Trello card suites and the new parity suites don't double-cover; mutation-test the final diff/apply and collision-naming modules specifically.
- [ ] **7.3 Docs:** update `docs/DIAGNOSTICS.md` with the perf event catalog; write `docs/perf/README.md` (how to run `pnpm perf`, add a metric, update baselines legitimately); mark the parity checklist as maintenance-mode (new Explorer features in VS Code releases get a row).
- [ ] **7.4 Cross-package audit:** `pnpm build` + full test suites across `core`, `extension`, `cli`, `mcp`, all `plugin-*`; verify no core API drift broke CLI/MCP consumers; bump baselines once, deliberately, to the final achieved numbers so future regressions measure against the new normal.
- [ ] **7.5 Board hygiene:** comment completion status on every linked child card (owner moves them to Done per board rules); file follow-up cards for anything waived that should be revisited (drag-out if platform-blocked, decorations-as-plugin-API if demand appears).

## Checkpoints (deterministic)

| # | Gate | Threshold |
| --- | --- | --- |
| 7-A | No scaffolding | grep for `experimental.dragMode`, `?perf=1` leakage in release bundle, superseded prompt flows → **0 hits**; release bundle size ≤ pre-epic size **+5%** |
| 7-B | Suites | full monorepo test run green; mutation testing on diff/apply + collision modules: **0 surviving mutants** in those files |
| 7-C | Docs | perf README + diagnostics catalog merged; checklist marked maintenance-mode |
| 7-D | Baselines rebased | `perf/baselines/` updated in a single dedicated commit referencing the Phase 6 report |
| 7-E | Board | 100% of linked child cards have a completion comment; follow-up cards filed for every deferred waiver |

---

# Risks / open questions

- **Drag semantics** (Phase 5) are intentionally unresolved until the dogfood spike; do not implement drag-move in Phase 2 even though the code path is adjacent.
- **In-place mutation of react-force-graph data** (Task 3.2): validate against the library's dynamic-data example before building; fallback documented in the task.
- **Git/diagnostics decoration APIs** (Task 2.7): the `vscode.git` extension API is semi-official; if per-file status proves unreliable, fall back to running `git status --porcelain` through the existing core git layer (the timeline feature already shells out to git).
- **Webview drag-out** (Task 5.5) may be platform-blocked by VS Code's webview sandbox — waiver path defined.
- **CI perf noise:** median-of-3 + 20% margins first; move to a larger/self-hosted runner before tightening thresholds, not after flaky reds erode trust in the gate.
- **`fileOpRoundtripMs` harness fidelity:** headless jsdom measurement excludes real extension-host IPC; Dev Host smoke walks (vehicle 4) are the honesty check — if perceived latency in the real host contradicts harness numbers, add an instrumented Dev Host scenario before trusting gate 3-C.
