# Mutation Site File Splits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split PR-touched source files that exceed the 50 mutation-site threshold into smaller feature-owned modules without running mutation survivor/kill tests.

**Architecture:** Use the existing main-branch mutation seed reports only as a read-only locator for over-threshold files. Keep public imports stable by leaving the original files as the exported behavior surface where practical, and move independently changing helpers into sibling feature modules with matching existing test coverage.

**Tech Stack:** TypeScript source modules, existing Vitest suites, `quality-tools organize`, and the checked-in PR branch worktree.

---

### Task 1: Split Cached Discovery Warmup From Pipeline Discovery

**Files:**
- Modify: `packages/extension/src/extension/pipeline/service/discoveryFacade.ts`
- Create: `packages/extension/src/extension/pipeline/service/cachedGraphWarmup.ts`
- Create: `packages/extension/src/extension/pipeline/service/indexStatus.ts`
- Create: `packages/extension/src/extension/pipeline/service/pluginState.ts`
- Test: `packages/extension/tests/extension/pipeline/service/discoveryFacade.test.ts`

- [x] **Step 1: Move cached warmup helpers**

Move the cached graph warmup input type, ignored segment set, candidate selection helpers, supported-file filtering, and warmup input creation into `cachedGraphWarmup.ts`. Export a small factory that receives registry/config/discovery callbacks and returns the selected warmup input.

- [x] **Step 2: Move plugin and index status helpers**

Move plugin initialization/reload/sync queueing plus effective filter pattern helpers into `pluginState.ts`, and move index status construction into `indexStatus.ts`.

- [x] **Step 3: Keep facade behavior stable**

Update `discoveryFacade.ts` so `loadCachedGraph` still schedules the same best-effort warmup, still ignores abort and missing-file errors, and still warns only for unexpected failures.

- [x] **Step 4: Run the targeted test**

```bash
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/service/discoveryFacade.test.ts
```

Expected: passes.

### Task 2: Split Graph View Analysis Coordination

**Files:**
- Modify: `packages/extension/src/extension/graphView/provider/analysis/methods.ts`
- Create: `packages/extension/src/extension/graphView/provider/analysis/fullIndex.ts`
- Test: `packages/extension/tests/extension/graphView/provider/analysis/methods.test.ts`

- [x] **Step 1: Move full-index coordination**

Move `FullIndexAnalysisCoordinator`, `FullIndexAnalysisCoordinatorState`, `FullIndexAnalysisKind`, and `canReplayStaleCache` into `fullIndex.ts`.

- [x] **Step 2: Reuse from methods**

Import the coordinator factory and stale-cache predicate from `methods.ts` so the method factory remains focused on wiring load/analyze/index/refresh actions.

- [x] **Step 3: Run the targeted test**

```bash
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/graphView/provider/analysis/methods.test.ts
```

Expected: passes.

### Task 3: Split Webview Graph Message Domains

**Files:**
- Modify: `packages/extension/src/webview/store/messageHandlers/graph.ts`
- Create: `packages/extension/src/webview/store/messageHandlers/graphData.ts`
- Create: `packages/extension/src/webview/store/messageHandlers/graphControls.ts`
- Test: `packages/extension/tests/webview/store/messageHandlers/graph.test.ts`

- [x] **Step 1: Move graph-data handlers**

Move graph-data duplicate detection, graph data updates, and node metric updates into `graphData.ts`.

- [x] **Step 2: Move graph-control handlers**

Move graph control equality assignment and control/settings/depth/direction/physics handlers into `graphControls.ts`.

- [x] **Step 3: Re-export public handlers**

Keep `graph.ts` as the existing import surface by re-exporting the moved handlers and retaining the remaining legend/filter/favorite handlers.

- [x] **Step 4: Run the targeted test**

```bash
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/store/messageHandlers/graph.test.ts
```

Expected: passes.

### Task 4: Split Smaller Over-Threshold Helpers

**Files:**
- Modify: `packages/core/src/graphCache/database/io/save.ts`
- Create: `packages/core/src/graphCache/database/io/saveAsync.ts`
- Create: `packages/core/src/graphCache/database/io/temporary.ts`
- Modify: `packages/extension/src/extension/graphView/analysis/execution/load.ts`
- Create: `packages/extension/src/extension/graphView/analysis/execution/load/context.ts`
- Modify: `packages/extension/src/extension/graphView/groups/defaults/materialTheme/pathMatch.ts`
- Create: `packages/extension/src/extension/graphView/groups/defaults/materialTheme/pathMatcher.ts`
- Tests:
  - `packages/core/tests/graphCache/database/storage.test.ts`
  - `packages/extension/tests/extension/graphView/analysis/execution/load.test.ts`
  - `packages/extension/tests/extension/graphView/groups/defaults/materialTheme/pathMatch.test.ts`

- [x] **Step 1: Move async database save**

Move async save progress/yield logic into `saveAsync.ts`; keep sync save and clear behavior in `save.ts`. Move temp-path rename/cleanup helpers into `temporary.ts`.

- [x] **Step 2: Move load context helpers**

Move raw-data context types, replayable-data predicate, and decision selection into `load/context.ts`.

- [x] **Step 3: Move material matcher construction**

Move matcher entry creation, basename indexing, and sorting into `pathMatcher.ts`.

- [x] **Step 4: Run targeted tests**

```bash
pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/graphCache/database/storage.test.ts
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/graphView/analysis/execution/load.test.ts tests/extension/graphView/groups/defaults/materialTheme/pathMatch.test.ts
```

Expected: passes.

### Task 5: Organize and Commit

**Files:**
- Modify only if `organize` reports actionable issues from the new split files.

- [x] **Step 1: Run organize**

```bash
pnpm run organize -- .
```

Expected: no new organization issues in the changed files.

- [ ] **Step 2: Commit and push**

```bash
git status --short
git add docs/superpowers/plans/2026-06-23-mutation-site-file-splits.md packages/core/src/graphCache/database/io/save.ts packages/core/src/graphCache/database/io/saveAsync.ts packages/core/src/graphCache/database/io/temporary.ts packages/extension/src/extension/pipeline/service/discoveryFacade.ts packages/extension/src/extension/pipeline/service/cachedGraphWarmup.ts packages/extension/src/extension/pipeline/service/indexStatus.ts packages/extension/src/extension/pipeline/service/pluginState.ts packages/extension/src/extension/graphView/provider/analysis/methods.ts packages/extension/src/extension/graphView/provider/analysis/fullIndex.ts packages/extension/src/webview/store/messageHandlers/graph.ts packages/extension/src/webview/store/messageHandlers/graphData.ts packages/extension/src/webview/store/messageHandlers/graphControls.ts packages/extension/src/extension/graphView/analysis/execution/load.ts packages/extension/src/extension/graphView/analysis/execution/load/context.ts packages/extension/src/extension/graphView/groups/defaults/materialTheme/pathMatch.ts packages/extension/src/extension/graphView/groups/defaults/materialTheme/pathMatcher.ts
git commit -m "refactor: split mutation-heavy changed modules"
git push
```
