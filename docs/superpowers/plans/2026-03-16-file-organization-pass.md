# File Organization Pass — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize all files touched by the core-extension-quality PR into logical subfolders with clean, non-redundant camelCase names, and mirror the structure 1:1 in tests.

**Architecture:** Pure file-move + import-update refactor. No logic changes. Each task groups a cluster of related files into a subfolder, renames them to drop the prefix that the folder now provides, and updates every import/mock path across the codebase. Tests mirror source structure exactly.

**Tech Stack:** TypeScript, Vitest, pnpm monorepo. Worktree at `/Users/poleski/Desktop/Projects/CodeGraphyV4-agent-worktrees/refactor-core-extension` on branch `refactor/core-extension-quality`.

**Validation commands:**
- Typecheck: `cd /Users/poleski/Desktop/Projects/CodeGraphyV4-agent-worktrees/refactor-core-extension && pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.json`
- Tests: `cd /Users/poleski/Desktop/Projects/CodeGraphyV4-agent-worktrees/refactor-core-extension && pnpm --filter @codegraphy/extension test`
- Targeted tests: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts <test-file-paths...>`

**Important rules:**
- Use `git mv` for all moves (preserves git history)
- After moving files, update ALL imports in both the moved files AND any files that import from them
- Search with `grep -r` for old import paths to catch stragglers
- Test files use `vi.mock()` / `vi.doMock()` with string paths — these must be updated too
- `describe()` block names should reflect the new folder path (e.g., `graphView/view/broadcast`)
- All file names use camelCase (no PascalCase for `.ts` files; React `.tsx` components keep PascalCase)
- Each task ends with typecheck + targeted test run before committing

---

## Chunk 1: Extension Source — graphView Reorganization

### Task 1: Group view* files into graphView/view/

**Files:**
- Move: `src/extension/graphView/viewBroadcast.ts` → `src/extension/graphView/view/broadcast.ts`
- Move: `src/extension/graphView/viewContext.ts` → `src/extension/graphView/view/context.ts`
- Move: `src/extension/graphView/viewRebuild.ts` → `src/extension/graphView/view/rebuild.ts`
- Move: `src/extension/graphView/viewSelection.ts` → `src/extension/graphView/view/selection.ts`
- Move: `tests/extension/graphView/viewBroadcast.test.ts` → `tests/extension/graphView/view/broadcast.test.ts`
- Move: `tests/extension/graphView/viewContext.test.ts` → `tests/extension/graphView/view/context.test.ts`
- Move: `tests/extension/graphView/viewRebuild.test.ts` → `tests/extension/graphView/view/rebuild.test.ts`
- Move: `tests/extension/graphView/viewSelection.test.ts` → `tests/extension/graphView/view/selection.test.ts`

- [ ] **Step 1: Create directory and move files**
```bash
cd /Users/poleski/Desktop/Projects/CodeGraphyV4-agent-worktrees/refactor-core-extension/packages/extension
mkdir -p src/extension/graphView/view tests/extension/graphView/view
git mv src/extension/graphView/viewBroadcast.ts src/extension/graphView/view/broadcast.ts
git mv src/extension/graphView/viewContext.ts src/extension/graphView/view/context.ts
git mv src/extension/graphView/viewRebuild.ts src/extension/graphView/view/rebuild.ts
git mv src/extension/graphView/viewSelection.ts src/extension/graphView/view/selection.ts
git mv tests/extension/graphView/viewBroadcast.test.ts tests/extension/graphView/view/broadcast.test.ts
git mv tests/extension/graphView/viewContext.test.ts tests/extension/graphView/view/context.test.ts
git mv tests/extension/graphView/viewRebuild.test.ts tests/extension/graphView/view/rebuild.test.ts
git mv tests/extension/graphView/viewSelection.test.ts tests/extension/graphView/view/selection.test.ts
```

- [ ] **Step 2: Update imports in moved source files**
Each moved file is now one directory deeper. Update relative imports:
- `../../shared/types` → `../../../shared/types`
- `../../core/views` → `../../../core/views`
- Sibling references: `./viewBroadcast` → `./broadcast`, `./viewContext` → `./context`, etc.

- [ ] **Step 3: Update imports in files that reference the moved files**
Search for old import paths and update them:
```bash
grep -r "viewBroadcast\|viewContext\|viewRebuild\|viewSelection" --include='*.ts' --include='*.tsx' -l packages/extension/src/ packages/extension/tests/
```
Common consumers: `provider/*.ts`, `messages/**/*.ts`, other graphView files.
Update `../viewBroadcast` → `../view/broadcast`, etc. (adjust relative depth per consumer location).

- [ ] **Step 4: Update test imports and mocks**
In moved test files: update relative paths to source (now one level deeper).
In test files that `vi.mock()` the moved modules: update the mock path strings.
Update `describe()` names to reflect new paths.

- [ ] **Step 5: Typecheck and run targeted tests**
```bash
pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.json
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/graphView/view/
```
Expected: all pass, zero type errors.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "refactor(extension): group view state files into graphView/view/"
```

---

### Task 2: Group visit* files into graphView/visits/

**Files:**
- Move: `src/extension/graphView/visits.ts` → `src/extension/graphView/visits/index.ts`
- Move: `src/extension/graphView/visitCounts.ts` → `src/extension/graphView/visits/counts.ts`
- Move: `src/extension/graphView/visitTracking.ts` → `src/extension/graphView/visits/tracking.ts`
- Move: `tests/extension/graphView/visits.test.ts` → `tests/extension/graphView/visits/index.test.ts`
- Move: `tests/extension/graphView/visitCounts.test.ts` → `tests/extension/graphView/visits/counts.test.ts`
- Move: `tests/extension/graphView/visitTracking.test.ts` → `tests/extension/graphView/visits/tracking.test.ts`

Steps follow the same pattern as Task 1: move → update internal imports → update consumers → update tests/mocks → typecheck + test → commit.

Commit message: `refactor(extension): group visit tracking files into graphView/visits/`

---

### Task 3: Group plugin* files into graphView/plugins/

**Files:**
- Move: `src/extension/graphView/pluginMessages.ts` → `src/extension/graphView/plugins/messages.ts`
- Move: `src/extension/graphView/pluginWebview.ts` → `src/extension/graphView/plugins/webview.ts`
- Move: `src/extension/graphView/externalPluginRegistration.ts` → `src/extension/graphView/plugins/registration.ts`
- Move: `tests/extension/graphView/pluginMessages.test.ts` → `tests/extension/graphView/plugins/messages.test.ts`
- Move: `tests/extension/graphView/pluginWebview.test.ts` → `tests/extension/graphView/plugins/webview.test.ts`
- Move: `tests/extension/graphView/externalPluginRegistration.test.ts` → `tests/extension/graphView/plugins/registration.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): group plugin integration files into graphView/plugins/`

---

### Task 4: Group file* files into graphView/files/

**Files:**
- Move: `src/extension/graphView/fileActions.ts` → `src/extension/graphView/files/actions.ts`
- Move: `src/extension/graphView/fileNavigation.ts` → `src/extension/graphView/files/navigation.ts`
- Move: `src/extension/graphView/fileRename.ts` → `src/extension/graphView/files/rename.ts`
- Move: `tests/extension/graphView/fileActions.test.ts` → `tests/extension/graphView/files/actions.test.ts`
- Move: `tests/extension/graphView/fileNavigation.test.ts` → `tests/extension/graphView/files/navigation.test.ts`
- Move: `tests/extension/graphView/fileRename.test.ts` → `tests/extension/graphView/files/rename.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): group file operation helpers into graphView/files/`

---

### Task 5: Group webview infra files into graphView/webview/

**Files:**
- Move: `src/extension/graphView/html.ts` → `src/extension/graphView/webview/html.ts`
- Move: `src/extension/graphView/resolveWebview.ts` → `src/extension/graphView/webview/resolve.ts`
- Move: `src/extension/graphView/webviewBridge.ts` → `src/extension/graphView/webview/bridge.ts`
- Move: `tests/extension/graphView/html.test.ts` → `tests/extension/graphView/webview/html.test.ts`
- Move: `tests/extension/graphView/resolveWebview.test.ts` → `tests/extension/graphView/webview/resolve.test.ts`
- Move: `tests/extension/graphView/webviewBridge.test.ts` → `tests/extension/graphView/webview/bridge.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): group webview infrastructure into graphView/webview/`

---

### Task 6: Move settings-adjacent files into graphView/settings/

**Files:**
- Move: `src/extension/graphView/allSettingsSync.ts` → `src/extension/graphView/settings/sync.ts`
- Move: `src/extension/graphView/disabledState.ts` → `src/extension/graphView/settings/disabled.ts`
- Move: `tests/extension/graphView/allSettingsSync.test.ts` → `tests/extension/graphView/settings/sync.test.ts`
- Move: `tests/extension/graphView/disabledState.test.ts` → `tests/extension/graphView/settings/disabled.test.ts`

Steps follow the same pattern as Task 1. Note: `settings/` folder already exists with config.ts, index.ts, lifecycle.ts, message.ts.

Commit message: `refactor(extension): move settings-adjacent files into graphView/settings/`

---

### Task 7: Group provider/analysis* into provider/analysis/

**Files:**
- Move: `src/extension/graphView/provider/analysis.ts` → `src/extension/graphView/provider/analysis/index.ts`
- Move: `src/extension/graphView/provider/analysisDelegates.ts` → `src/extension/graphView/provider/analysis/delegates.ts`
- Move: `src/extension/graphView/provider/analysisExecution.ts` → `src/extension/graphView/provider/analysis/execution.ts`
- Move: `src/extension/graphView/provider/analysisHandlers.ts` → `src/extension/graphView/provider/analysis/handlers.ts`
- Move: `src/extension/graphView/provider/analysisRequest.ts` → `src/extension/graphView/provider/analysis/request.ts`
- Move: `src/extension/graphView/provider/analysisState.ts` → `src/extension/graphView/provider/analysis/state.ts`
- Move matching test files into `tests/extension/graphView/provider/analysis/`
  - `analysis.test.ts` → `analysis/index.test.ts`
  - `analysisDefaultDependencies.test.ts` → `analysis/defaultDependencies.test.ts`
  - `analysisDelegates.test.ts` → `analysis/delegates.test.ts`
  - `analysisExecution.test.ts` → `analysis/execution.test.ts`
  - `analysisHandlers.test.ts` → `analysis/handlers.test.ts`
  - `analysisRequest.test.ts` → `analysis/request.test.ts`
  - `analysisState.test.ts` → `analysis/state.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): group provider analysis files into provider/analysis/`

---

### Task 8: Move workspace* helpers into workspaceAnalyzer/

**Files:**
- Move: `src/extension/workspaceAnalysisCache.ts` → `src/extension/workspaceAnalyzer/cache.ts`
- Move: `src/extension/workspaceAnalyzerAbort.ts` → `src/extension/workspaceAnalyzer/abort.ts`
- Move: `src/extension/workspaceFileAnalysis.ts` → `src/extension/workspaceAnalyzer/fileAnalysis.ts`
- Move: `src/extension/workspaceGraphData.ts` → `src/extension/workspaceAnalyzer/graphData.ts`
- Move: `src/extension/workspaceGraphEdges.ts` → `src/extension/workspaceAnalyzer/graphEdges.ts`
- Move: `src/extension/workspaceGraphNodes.ts` → `src/extension/workspaceAnalyzer/graphNodes.ts`
- Move: `src/extension/workspacePluginStatuses.ts` → `src/extension/workspaceAnalyzer/pluginStatuses.ts`
- Move matching test files into `tests/extension/workspaceAnalyzer/`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): move workspace helpers into workspaceAnalyzer/`

---

### Task 9: Group gitHistory/cache* and diff* into subfolders

**Files:**
- Move: `src/extension/gitHistory/cachePaths.ts` → `src/extension/gitHistory/cache/paths.ts`
- Move: `src/extension/gitHistory/cacheState.ts` → `src/extension/gitHistory/cache/state.ts`
- Move: `src/extension/gitHistory/cacheStorage.ts` → `src/extension/gitHistory/cache/storage.ts`
- Move: `src/extension/gitHistory/diffGraphAnalysis.ts` → `src/extension/gitHistory/diff/analysis.ts`
- Move: `src/extension/gitHistory/diffGraphChanges.ts` → `src/extension/gitHistory/diff/changes.ts`
- Move: `src/extension/gitHistory/diffGraphSnapshot.ts` → `src/extension/gitHistory/diff/snapshot.ts`
- Move: `src/extension/gitHistory/diffGraphState.ts` → `src/extension/gitHistory/diff/state.ts`
- Move matching test files into `tests/extension/gitHistory/cache/` and `tests/extension/gitHistory/diff/`

Steps follow the same pattern as Task 1.

Commit message: `refactor(extension): group gitHistory cache and diff files into subfolders`

---

## Chunk 2: Webview — graph Component Reorganization

### Task 10: Move model files into their logical folders (components/)

**Files:**
- Move: `src/webview/components/graphContextMenuModel.ts` → `src/webview/components/graphContextMenu/model.ts`
- Move: `src/webview/components/graphInteractionModel.ts` → `src/webview/components/graphInteraction/model.ts`
- Move: `src/webview/components/graphModel.ts` → `src/webview/components/graphModel/index.ts`
- Move: `src/webview/components/graph/interactionHandlers.ts` → `src/webview/components/graph/interactionHandlers/index.ts`
- Move matching test files:
  - `tests/webview/graphContextMenuModel.test.ts` → `tests/webview/graphContextMenu/model.test.ts`
  - `tests/webview/graphInteractionModel.test.ts` → `tests/webview/graphInteraction/model.test.ts`
  - `tests/webview/graphModel.test.ts` → `tests/webview/graphModel/index.test.ts`
  - `tests/webview/graph/interactionHandlers.test.ts` → `tests/webview/graph/interactionHandlers/index.test.ts`
  - `tests/webview/graph/interactionHandlers.testUtils.ts` → `tests/webview/graph/interactionHandlers/testUtils.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): move model files into their logical folders`

---

### Task 11: Group graphSupport* into components/graphSupport/

**Files:**
- Move: `src/webview/components/graphSupport.ts` → `src/webview/components/graphSupport/index.ts`
- Move: `src/webview/components/graphSupportDom.ts` → `src/webview/components/graphSupport/dom.ts`
- Move: `src/webview/components/graphSupportGuards.ts` → `src/webview/components/graphSupport/guards.ts`
- Move: `src/webview/components/graphSupportLinkTargets.ts` → `src/webview/components/graphSupport/linkTargets.ts`
- Move: `src/webview/components/graphSupportTypes.ts` → `src/webview/components/graphSupport/types.ts`
- Move: `tests/webview/graphSupport.test.ts` → `tests/webview/graphSupport/index.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): group graphSupport files into components/graphSupport/`

---

### Task 12: Group graphWebviewMessage* into components/graphWebviewMessages/

**Files:**
- Move: `src/webview/components/graphWebviewMessageEffects.ts` → `src/webview/components/graphWebviewMessages/effects.ts`
- Move: `src/webview/components/graphWebviewMessageEffectHelpers.ts` → `src/webview/components/graphWebviewMessages/helpers.ts`
- Move: `tests/webview/graphWebviewMessageEffects.test.ts` → `tests/webview/graphWebviewMessages/effects.test.ts`
- Move: `tests/webview/graphWebviewMessageEffectHelpers.test.ts` → `tests/webview/graphWebviewMessages/helpers.test.ts`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): group webview message effect files into graphWebviewMessages/`

---

### Task 13: Group contextMenuRuntime* into graph/contextMenuRuntime/

**Files:**
- Move: `src/webview/components/graph/contextMenuRuntime.ts` → `src/webview/components/graph/contextMenuRuntime/index.ts`
- Move: `src/webview/components/graph/contextMenuRuntimeEffects.ts` → `src/webview/components/graph/contextMenuRuntime/effects.ts`
- Move: `src/webview/components/graph/contextMenuRuntimeFallback.ts` → `src/webview/components/graph/contextMenuRuntime/fallback.ts`
- Move: `src/webview/components/graph/contextMenuRuntimeFallbackEvent.ts` → `src/webview/components/graph/contextMenuRuntime/fallbackEvent.ts`
- Move: `src/webview/components/graph/contextMenuRuntimePointer.ts` → `src/webview/components/graph/contextMenuRuntime/pointer.ts`
- Move: `src/webview/components/graph/contextMenuRuntimeTooltip.ts` → `src/webview/components/graph/contextMenuRuntime/tooltip.ts`
- Move matching test files into `tests/webview/graph/contextMenuRuntime/`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): group contextMenuRuntime files into graph/contextMenuRuntime/`

---

### Task 14: Group contextAction* into graph/contextActions/

**Files:**
- Move: `src/webview/components/graph/contextActionBuilders.ts` → `src/webview/components/graph/contextActions/builders.ts`
- Move: `src/webview/components/graph/builtinContextActionEffects.ts` → `src/webview/components/graph/contextActions/builtinEffects.ts`
- Move: `src/webview/components/graph/pluginContextActionEffects.ts` → `src/webview/components/graph/contextActions/pluginEffects.ts`
- Move: `src/webview/components/graphContextActionEffects.ts` → `src/webview/components/graph/contextActions/effects.ts`
- Move matching test files into `tests/webview/graph/contextActions/`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): group context action files into graph/contextActions/`

---

### Task 15: Group keyboard* into graph/keyboard/

**Files:**
- Move: `src/webview/components/graph/keyboardListener.ts` → `src/webview/components/graph/keyboard/listener.ts`
- Move: `src/webview/components/graph/keyboardCommandBuilders.ts` → `src/webview/components/graph/keyboard/commandBuilders.ts`
- Move: `src/webview/components/graph/keyboardCommandLookup.ts` → `src/webview/components/graph/keyboard/commandLookup.ts`
- Move: `src/webview/components/graph/keyboardShortcutResolvers.ts` → `src/webview/components/graph/keyboard/shortcutResolvers.ts`
- Move: `src/webview/components/graph/keyboardToolbarShortcutResolver.ts` → `src/webview/components/graph/keyboard/toolbarShortcutResolver.ts`
- Move: `src/webview/components/graphKeyboardEffects.ts` → `src/webview/components/graph/keyboard/effects.ts`
- Move matching test files into `tests/webview/graph/keyboard/`

Steps follow the same pattern as Task 1.

Commit message: `refactor(webview): group keyboard files into graph/keyboard/`

---

## Chunk 3: Webview Tests — Mirror Source Structure

### Task 16: Move graphInteraction* tests into graphInteraction/

**Files:**
- Move: `tests/webview/graphInteractionNodeClick.test.ts` → `tests/webview/graphInteraction/nodeClick.test.ts`
- Move: `tests/webview/graphInteractionNodeDoubleClick.test.ts` → `tests/webview/graphInteraction/nodeDoubleClick.test.ts`
- Move: `tests/webview/graphInteractionNodeSelection.test.ts` → `tests/webview/graphInteraction/nodeSelection.test.ts`
- Move: `tests/webview/graphInteractionNodeSingleClick.test.ts` → `tests/webview/graphInteraction/nodeSingleClick.test.ts`
- Move: `tests/webview/graphInteractionPointer.test.ts` → `tests/webview/graphInteraction/pointer.test.ts`
- Move: `tests/webview/graphInteractionSurfaceClick.test.ts` → `tests/webview/graphInteraction/surfaceClick.test.ts`

These tests already test files in `src/webview/components/graphInteraction/` — they just need to be moved to mirror the structure.

Steps: move → update import paths in test files → run tests → commit.

Commit message: `refactor(webview): move graphInteraction tests to mirror source structure`

---

### Task 17: Move GraphContextMenu* tests and remaining graph tests

**Files:**
- Move: `tests/webview/GraphContextMenu.background.test.tsx` → `tests/webview/graphContextMenu/background.test.tsx`
- Move: `tests/webview/GraphContextMenu.edge.test.tsx` → `tests/webview/graphContextMenu/edge.test.tsx`
- Move: `tests/webview/GraphContextMenu.node.test.tsx` → `tests/webview/graphContextMenu/node.test.tsx`
- Move: `tests/webview/graphTooltipModel.test.ts` → `tests/webview/graph/tooltipModel.test.ts` (source is `components/graphTooltipModel.ts` — a graph-level model)
- Move: `tests/webview/GraphCursor.test.tsx` → `tests/webview/graph/cursor.test.tsx`
- Move: `tests/webview/GraphDoubleClickFocus.test.tsx` → `tests/webview/graph/doubleClickFocus.test.tsx`
- Move: `tests/webview/GraphDrag.test.tsx` → `tests/webview/graph/drag.test.tsx`

Steps: move → update import paths → run tests → commit.

Commit message: `refactor(webview): move remaining graph tests to mirror source structure`

---

## Chunk 4: Final Verification

### Task 18: Full test suite and typecheck

- [ ] **Step 1: Run full typecheck**
```bash
cd /Users/poleski/Desktop/Projects/CodeGraphyV4-agent-worktrees/refactor-core-extension
pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.json
```
Expected: zero errors.

- [ ] **Step 2: Run full test suite**
```bash
pnpm --filter @codegraphy/extension test
```
Expected: all 454+ test files pass.

- [ ] **Step 3: Run lint**
```bash
pnpm --filter @codegraphy/extension exec eslint --ext .ts,.tsx src/ tests/
```

- [ ] **Step 4: Push to PR**
```bash
git push origin refactor/core-extension-quality
```

---

## Task Dependency Map

Tasks 1–9 (Chunk 1, extension) are independent of each other and can run in parallel.
Tasks 10–15 (Chunk 2, webview source) are independent of each other and can run in parallel.
Tasks 16–17 (Chunk 3, webview tests) depend on Tasks 10–15 completing first (source must be in final location).
Task 18 (Chunk 4) depends on all prior tasks.

```
[Tasks 1-9] ──────────────────────────┐
                                       ├──→ [Task 18: Final verify + push]
[Tasks 10-15] → [Tasks 16-17] ────────┘
```
