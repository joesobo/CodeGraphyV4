# VS Code Explorer Parity + Native-Feel Performance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Setup

- Trello epic: [Epic: VS Code Explorer parity + native-feel performance](https://trello.com/c/hmVekNGe)
- Linked child cards: copy/paste, drag-to-folder move, open in terminal, compare selected, close open file, files.exclude toggle, external file drag, Explorer-equivalent context menus, Escape-close panels, physics presets, active-editor outline, Explorer "Open in CodeGraphy"
- Branch: `feat/explorer-parity-performance-plan`
- Base: `main` at `6c5eb25a2`

**Goal:** Anything you can do in the built-in VS Code File Explorer, you can do from the CodeGraphy graph — and it feels equally snappy and integrated.

**Architecture:** Four phases. Phase 2 (metrics harness) executes **first** because every other phase's checkpoints are defined against its baselines. Then Phase 1 (feature-gap closure), Phase 3 (performance work), Phase 4 (feel & polish). Each phase has deterministic checkpoint gates: a phase is not done until every gate value is met and recorded.

**Tech Stack:** VS Code extension host (esbuild/CJS), React webview (Vite), react-force-graph-2d/3d, tree-sitter analysis in `packages/core`, ladybugdb Graph Cache, existing diagnostics event system (`core/src/diagnostics/`, `docs/DIAGNOSTICS.md`).

## Global Constraints

- Required development workflow applies to every task: acceptance scenarios for user-visible behavior, CRAP score ≤ 8 for new/modified functions, differential mutation testing on changed code.
- All FS mutations must route through `extension/undoManager` as `IUndoableAction`s (existing pattern in `packages/extension/src/extension/actions/`).
- Mutation availability gating (`contextMenu/mutationAvailability.ts`) must be respected: no destructive action while browsing Graph Revision history.
- All new webview↔extension messages validated with zod (established repo pattern).
- Before implementing graph rendering behavior, check react-force-graph README/examples first (repo rule).
- Baseline fixture = the CodeGraphy monorepo itself unless a phase names a synthetic fixture.

## Execution order

```
Phase 2 (metrics harness + baselines)   ← do first, everything gates on it
Phase 1 (Explorer feature-gap closure)  ← can start in parallel after 2.1
Phase 3 (performance work)              ← requires Phase 2 complete
Phase 4 (feel & polish)                 ← requires Phase 1 + 3
```

---

# Phase 2 — Metrics harness and baselines (execute first)

## Goal

A deterministic, repeatable measurement harness (`pnpm perf`) that produces a JSON report of every metric below on fixed fixtures, plus recorded baselines and a CI regression gate. Without this, Phase 3 "improvements" are anecdotes.

## How

### Task 2.1: Fixture workspaces

**Files:**
- Create: `perf/fixtures/generate.ts` (synthetic workspace generator)
- Create: `perf/fixtures/manifest.json` (fixture definitions)
- Test: `perf/fixtures/generate.test.ts`

**Fixture set (deterministic — generated from a fixed seed, committed manifest, never random at run time):**

| Fixture | Files | Expected nodes | Expected links | Notes |
| --- | ---: | ---: | ---: | --- |
| `small` | 100 | ~120 | ~200 | TS files with import chains |
| `medium` | 1,000 | ~1,200 | ~2,500 | TS + folders 4 deep |
| `large` | 5,000 | ~6,000 | ~14,000 | mixed TS/Python/Markdown |
| `huge` | 10,000 | ~12,000 | ~30,000 | stress fixture |
| `self` | (repo) | actual | actual | CodeGraphy monorepo, real-world anchor |

- [ ] **Step 1:** Write `generate.ts` producing files from `manifest.json` (fixed file list, fixed import graph derived from index arithmetic, e.g. file *i* imports files *i/2* and *i/3* — no randomness).
- [ ] **Step 2:** Test asserts regenerating a fixture twice yields byte-identical trees (hash the tree).
- [ ] **Step 3:** Commit.

### Task 2.2: Core/extension timing metrics

**Files:**
- Modify: `packages/core/src/indexing/workspace/timing.ts` (reuse `timeIndexPhase` pattern)
- Create: `packages/core/src/diagnostics/perfMetrics.ts` (metric event names + zod schemas)
- Create: `perf/run.ts` (harness entry — headless: drives `core` indexing + a jsdom-hosted webview store)
- Create: `perf/report.ts` (writes `perf/results/<fixture>.json`)

**Metric keys (exact names the report must contain):**

| Key | Definition |
| --- | --- |
| `coldOpenMs` | engine `index()` start → first full `IGraphData` produced, cache empty |
| `warmOpenMs` | same, with populated Graph Cache |
| `incrementalRefreshMs` | `applyChangedFiles([one file])` → new `IGraphData` returned |
| `payloadBytes` | serialized size of the message posted to the webview per refresh |
| `watcherToGraphMs` | watcher event fired → webview store `graphData` updated |
| `fileOpRoundtripMs` | action dispatch (e.g. rename) → node updated in webview store |
| `layoutResets` | count of physics layout resets per scenario (instrument `runtime/use/physics/hook/layout.ts`) |
| `cacheSaveMs` / `cacheBytes` | Graph Cache persistence cost |

- [ ] **Step 1:** Add a `perf/*` diagnostics event per key, emitted from the code paths above.
- [ ] **Step 2:** `perf/run.ts` runs scenarios per fixture: cold open, warm open, single-file save, single-file rename, 100-file batch change (simulated git checkout), delete file.
- [ ] **Step 3:** Report writer emits one JSON per fixture with every key present (schema-validated — a missing key fails the run).
- [ ] **Step 4:** Wire `pnpm perf` script at repo root. Commit.

### Task 2.3: Webview rendering metrics

**Files:**
- Create: `packages/extension/src/webview/perf/frameMetrics.ts` (rAF-based FPS sampler + PerformanceObserver long-task counter, enabled by `?perf=1` query flag)
- Create: `perf/webview.spec.ts` (Playwright scenario using the existing screenshot-workflow harness: build webview, serve `dist/webview`, inject fixture graph via `postMessage`)

**Metric keys:** `fpsIdle`, `fpsDrag`, `fpsSettle`, `longTasksPerInteraction`, `heapUsedBytes`.

- [ ] **Step 1:** Implement sampler; expose results on `window.__codegraphyPerf` for Playwright to read.
- [ ] **Step 2:** Playwright script: load `medium` and `large` fixtures, run idle 5s / programmatic node drag 5s / layout settle, read metrics.
- [ ] **Step 3:** Commit.

### Task 2.4: Record baselines + CI gate

**Files:**
- Create: `perf/baselines/*.json` (committed baseline per fixture)
- Create: `.github/workflows/perf.yml` (runs `small` + `medium` fixtures only — cheap subset)

- [ ] **Step 1:** Run `pnpm perf` 5 times on a quiet machine; record median per key as baseline.
- [ ] **Step 2:** CI job fails if any key regresses >20% vs baseline (median of 3 CI runs to absorb runner noise).
- [ ] **Step 3:** Commit baselines + workflow.

## How to know it's done / Deterministic checkpoints

| # | Gate | Threshold (deterministic) |
| --- | --- | --- |
| 2-A | Fixture determinism | Regenerating any fixture twice → identical tree hash, `0` diff bytes |
| 2-B | Report completeness | `pnpm perf` exits `0` and every fixture JSON validates against schema with **all 8 core keys + 5 webview keys present** |
| 2-C | Measurement stability | 5 consecutive runs on `medium`: coefficient of variation **< 10%** for every timing key (else the metric is too noisy to gate on — fix the scenario before proceeding) |
| 2-D | Baselines recorded | `perf/baselines/` contains one JSON per fixture, referenced by CI |
| 2-E | CI gate live | Perf workflow green on a no-op PR; red on a PR that adds `await sleep(500)` to `refreshFacade` (verify once, then revert) |

**Phase 2 exit = all five gates checked with values pasted into the PR description.**

---

# Phase 1 — Explorer feature-gap closure

## Goal

100% coverage of the built-in Explorer's file operations from the graph (each item implemented or explicitly waived with a reason), with acceptance tests per operation.

## How

### Task 1.1: Canonical parity checklist

**Files:**
- Create: `docs/plans/explorer-parity-checklist.md`

- [ ] **Step 1:** Enumerate every command VS Code contributes to the Explorer context menu and keyboard (source: `workbench.files` command set — `explorer.newFile`, `explorer.newFolder`, `renameFile`, `moveFileToTrash`, `copyFilePath`, `copyRelativeFilePath`, `revealFileInOS`, `filesExplorer.copy`, `filesExplorer.cut`, `filesExplorer.paste`, `explorer.openToSide`, `explorer.openWith`, `openInTerminal`, `selectForCompare`, `compareSelected`, `duplicateFile`, `explorer.download`, drag-move, drag-copy (Alt), external drop, multi-select variants).
- [ ] **Step 2:** Mark each as `done` / `todo` / `waived(reason)` against the current audit (already-done set: open, reveal, copy paths, rename, delete+undo, new file/folder, favorites).
- [ ] **Step 3:** Commit. This file is the single source of truth for gate 1-A.

### Task 1.2: Cut / Copy / Paste files

**Files:**
- Create: `packages/extension/src/extension/actions/clipboardFiles.ts` (cut/copy/paste as `IUndoableAction`s; paste = FS copy or move; name-collision policy identical to Explorer: append ` copy`, ` copy 2`, …)
- Modify: `packages/extension/src/webview/components/graph/contextMenu/contracts.ts` (add `cutFiles`, `copyFiles`, `pasteFiles` to `BuiltInContextMenuAction`)
- Modify: `contextMenu/node/entries.ts`, `contextMenu/node/folderEntries.ts`, `contextMenu/background/entries.ts` (paste on folder/background targets)
- Modify: `extension/graphView/webview/providerMessages/primaryActions/workspaceFileActions.ts` (dispatch)
- Test: acceptance scenarios — copy→paste duplicates file with ` copy` suffix; cut→paste moves file; paste into same folder; multi-select copy of 3 files; undo restores original state.

- [ ] Write failing acceptance tests → implement → pass → commit.

### Task 1.3: Drag node onto folder node moves the file on disk

**Files:**
- Modify: `packages/extension/src/webview/components/graph/runtime/use/interaction/nodeDrag/` (add drop-target detection: when drag ends with pointer over a folder node and `Shift` held — plain drag stays layout-only so existing behavior is not broken)
- Create: `packages/extension/src/extension/actions/moveFiles.ts` (`IUndoableAction`, honors `explorer.confirmDragAndDrop`)
- Test: acceptance — drop file node on folder node moves file, edges re-resolve after refresh, undo moves it back; drop on self/descendant folder is a no-op with notice.

- [ ] Write failing tests → implement → pass → commit.

### Task 1.4: Keyboard parity

**Files:**
- Modify: `packages/extension/src/webview/components/graph/keyboard/command/lookup.ts`

Mappings to add (matching Explorer defaults): `Delete`/`Cmd+Backspace` → delete selected (was explicitly `null`), `F2`/`Enter-on-mac-convention: keep Enter=open` → rename, `Cmd/Ctrl+C` → copy files, `Cmd/Ctrl+X` → cut, `Cmd/Ctrl+V` → paste, `Cmd/Ctrl+Enter` → open to side, arrow keys → move selection to nearest node in that direction.

- [ ] One commit per mapping group with acceptance tests (keyboard event → correct action message dispatched; respects `mutationAvailability`).

### Task 1.5: Open variants + compare + terminal + close (absorb linked child cards)

**Files:**
- Modify: `contextMenu/contracts.ts`, `contextMenu/node/entries.ts`, extension dispatch files

Actions: Open to the Side (`vscode.window.showTextDocument` with `ViewColumn.Beside`), Open With…, Open in Integrated Terminal (folder + file's parent), Select for Compare / Compare with Selected (exactly-two-files gating), Close open editor for selected file node, Duplicate file.

- [ ] Implement each as its own commit with an acceptance scenario; update the linked Trello child card when its action lands.

### Task 1.6: files.exclude toggle + external file drop

**Files:**
- Modify: graph filters UI (`webview/components/` filters panel) — toggle honoring VS Code `files.exclude`
- Create: `webview` drop handler for OS files → copy into workspace at drop-target folder (respect `explorer.confirmDragAndDrop`)

- [ ] Implement with acceptance tests → commit.

## How to know it's done / Deterministic checkpoints

| # | Gate | Threshold (deterministic) |
| --- | --- | --- |
| 1-A | Checklist coverage | `explorer-parity-checklist.md`: **0 items in `todo`** — every item `done` or `waived(reason)`; waived count ≤ 3 |
| 1-B | Milestone 1 (after 1.2–1.3) | cut/copy/paste + drag-move merged; acceptance suite counts **≥ 12 new passing scenarios** |
| 1-C | Milestone 2 (after 1.4) | keyboard map: **7 new bindings** resolve to actions in `lookup.ts` unit tests; `Delete` no longer maps to `null` |
| 1-D | Undo integrity | every new FS mutation has an undo acceptance test: **100%** of new actions in `extension/actions/` implement `IUndoableAction` (grep-countable) |
| 1-E | No perf regression | Phase 2 CI gate stays green on every parity PR (≤ +20% on all keys, and `fileOpRoundtripMs` on `medium` ≤ **200ms** even before Phase 3) |
| 1-F | Workflow gates | CRAP ≤ 8 on all new functions; differential mutation testing passes per PR |

---

# Phase 3 — Performance work

## Goal

Structural changes so the graph updates like the Explorer tree does: incremental, local, immediate. Ordered by expected impact; each item has its own before/after measurement against Phase 2 baselines.

## How

### Task 3.1: Graph diff protocol to the webview

**Files:**
- Create: `packages/core/src/graph/diff.ts` (`diffGraphData(prev, next) → { addedNodes, removedNodeIds, updatedNodes, addedLinks, removedLinkIds }` + zod schema)
- Modify: `packages/extension/src/extension/pipeline/service/refreshFacade.ts` (incremental refresh modes emit `GraphDataPatched` message; full `GraphDataUpdated` reserved for cold open / re-index)
- Modify: `packages/extension/src/webview/store/messageHandlers/graphDataMessage/payload.ts` + create `patch.ts` (apply diff in place, generalizing the existing `metricUpdates.ts` pattern)
- Test: property test — for any (prev, next) pair from fixtures, `apply(prev, diff(prev, next))` deep-equals `next`.

- [ ] Failing property test → implement diff → implement apply → pass → measure `payloadBytes` on `medium` single-file save → commit with numbers in message.

### Task 3.2: Kill unnecessary layout resets

**Files:**
- Modify: `packages/extension/src/webview/components/graph/view/layoutKey.ts` — delete the O(n) `nodeIds.join('|')` string build; replace with an explicit `structureVersion` counter bumped only by the patch/replace handlers when node/link **membership** changes
- Modify: `packages/extension/src/webview/components/graph/runtime/use/physics/hook/layout.ts` — on patch: mutate the live graph data object in place (react-force-graph supports this — verify against the official dynamic-graph example first, per repo rule) and reheat locally (`d3ReheatSimulation`) instead of full reset; full reset only on `GraphDataUpdated`
- Test: `layoutResets` metric = 0 across the single-file-save scenario; existing node positions preserved (assert positions of untouched nodes unchanged after patch).

- [ ] Failing test → implement → pass → commit.

### Task 3.3: Optimistic UI for file ops

**Files:**
- Create: `packages/extension/src/webview/store/optimistic.ts` (apply rename/delete/create/move to store immediately with a pending flag; reconcile on next `GraphDataPatched`; roll back + toast on action failure message)
- Modify: action dispatch path in `webview` context menu handlers
- Test: acceptance — rename shows new label in the store synchronously (same tick); failure message rolls back.

- [ ] Failing test → implement → pass → commit.

### Task 3.4: Payload trimming + batch storms

**Files:**
- Modify: `IGraphData` serialization boundary — audit fields the webview never reads (measure with a field-access proxy in tests); strip them from the wire format
- Modify: `extension/workspaceFiles/refresh/scheduler.ts` — coalesce a 100-file burst (git checkout) into **one** diff computation; verify the 32ms window holds or widen adaptively (32ms → 250ms when >20 events pending)

- [ ] Measure `watcherToGraphMs` on the 100-file batch scenario before/after → commit with numbers.

## How to know it's done / Deterministic checkpoints

All values measured by `pnpm perf` on the named fixture, median of 5 runs, compared to Phase 2 baselines.

| # | Gate | Fixture | Threshold (deterministic) |
| --- | --- | --- | --- |
| 3-A | Diff payload | `medium`, single-file save | `payloadBytes` ≤ **10 KB** AND ≥ **95% smaller** than baseline full payload |
| 3-B | Zero resets | `medium` + `large`, single-file save/rename/create/delete | `layoutResets` = **0**; untouched-node position drift = **0 px** before reheat |
| 3-C | Optimistic latency | `medium` | `fileOpRoundtripMs` (perceived, optimistic apply) ≤ **50ms**; reconciled ≤ **250ms** |
| 3-D | Watcher latency | `medium` single file / 100-file batch | `watcherToGraphMs` ≤ **250ms** / ≤ **1,500ms** |
| 3-E | Warm startup | `self` (monorepo) | `warmOpenMs` ≤ **2,000ms** (baseline anchor: 4,614ms measured in PR #294 notes) |
| 3-F | Frame rate | `large` | `fpsIdle` ≥ **55**, `fpsDrag` ≥ **30**, `longTasksPerInteraction` ≤ **2** |
| 3-G | Memory | `huge` | `heapUsedBytes` ≤ **500 MB** |
| 3-H | No cold regression | `self` | `coldOpenMs` ≤ baseline **+10%** (diff work must not slow cold path) |

**Checkpoint order:** 3-A/3-B gate merging Task 3.1–3.2; 3-C gates 3.3; 3-D gates 3.4; 3-E through 3-H gate phase exit.

---

# Phase 4 — Feel & polish

## Goal

Interactions match Explorer conventions exactly, so nothing about CodeGraphy feels "webview-ish".

## How

### Task 4.1: Respect Explorer settings

**Files:**
- Modify: `extension/actions/deleteFiles.ts` (honor `explorer.confirmDelete`; trash vs permanent per `files.enableTrash`)
- Modify: `extension/actions/moveFiles.ts` (honor `explorer.confirmDragAndDrop`)
- Modify: filters pipeline (honor `files.exclude` from Task 1.6 as default-on)

- [ ] Acceptance test per setting (setting on → dialog/behavior; off → silent) → commit.

### Task 4.2: Inline rename on the node label

**Files:**
- Modify: graph node rendering + `rename` action path — F2/rename opens an inline text input positioned over the node label (HTML overlay at node screen coords), Enter commits, Escape cancels; replaces the input-prompt flow.

- [ ] Acceptance test: rename flow never leaves the graph view → commit.

### Task 4.3: Loading states

**Files:**
- Modify: webview cold-open path — skeleton/ghost graph (last session's node positions from persisted state, dimmed) instead of blank canvas until first `GraphDataUpdated`.

- [ ] Playwright visual test: at `t+100ms` after open, canvas is non-blank (pixel-diff vs blank frame > 1% differing pixels) → commit.

### Task 4.4: Confirm dialogs and copy match VS Code wording

- [ ] Audit every dialog string against the Explorer's exact wording (e.g. "Are you sure you want to delete 'x'?" / "You can restore this file from the Trash."); table in `explorer-parity-checklist.md`; fix mismatches → commit.

## How to know it's done / Deterministic checkpoints

| # | Gate | Threshold (deterministic) |
| --- | --- | --- |
| 4-A | Settings honored | acceptance tests for **4 settings** (`explorer.confirmDelete`, `explorer.confirmDragAndDrop`, `files.enableTrash`, `files.exclude`) — all pass in both on/off states (8 scenarios) |
| 4-B | Inline rename | rename completes with **0** focus departures from the graph webview (asserted in test); input appears ≤ **100ms** after F2 |
| 4-C | Cold-open feel | Playwright pixel gate: non-blank canvas at **100ms**; skeleton→real graph swap without full re-layout (`layoutResets` ≤ 1 on cold open) |
| 4-D | Dialog copy | string-audit table: **0** unexplained mismatches vs Explorer wording |
| 4-E | Epic exit | Phase 1 checklist still 100%; **all Phase 3 gates re-run green** on final branch; perf CI green 5 consecutive runs |

---

# Risks / open questions

- **Arrow-key node navigation** (Task 1.4) on a force layout has no obvious "next node" — nearest-neighbor by angle sector is the plan; if it feels bad, waive with reason (allowed under gate 1-A's ≤ 3 waivers).
- **Drag-to-move modifier** (Shift) vs plain drag: chosen to avoid breaking layout-drag muscle memory; revisit after dogfooding — flag in the child card.
- **In-place mutation of react-force-graph data** (Task 3.2) must be validated against the library's dynamic-graph example before building; if unsupported in our version (^1.29.1), fall back to node-object identity preservation across replaces (keep same object refs for unchanged nodes so the sim retains positions).
- **CI perf noise** on shared runners: gates use median-of-3 and +20% margins; if still flaky, move perf CI to a self-hosted/larger runner before tightening.
