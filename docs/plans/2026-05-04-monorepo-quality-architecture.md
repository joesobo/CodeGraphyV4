# Monorepo Quality And Architecture Pass

## Setup

- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4-monorepo-quality-architecture`
- Branch: `codex/monorepo-quality-architecture`
- PR base branch: `main`
- Started from: `79f5f648` (`Merge pull request #199 from joesobo/codex/graph-context-menu-architecture`)
- Stop time: 2026-05-05 02:10 PDT
- Domain source: `CONTEXT.md`
- Quality source: `docs/quality/`

## Goal

Run the local quality tools across the CodeGraphy monorepo, fix issues that are actionable in this pass, and deepen architecture where the current package seams are shallow or hard to maintain.

The cleanup should keep the project readable for future maintainers and agents:

- package responsibilities are clear
- source modules are deep enough to provide leverage
- tests exercise stable interfaces instead of incidental implementation details
- docs explain the project and packages in current domain language

## Working Rules

- Commit and push frequently.
- Keep the branch isolated from the protected main worktree.
- Prefer scoped mutation runs over a full mutation suite.
- Re-run a failing quality tool after fixing the issue it found.
- Update docs after the large-scale cleanup so the package map and project purpose stay current.
- Add changesets for user-facing behavior changes. Skip changesets for docs, tests, and internal refactors.

## Baseline Gates

Run these broad gates before choosing cleanup targets:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`

Run package quality tools across monorepo packages:

- `pnpm run organize -- <package>`
- `pnpm run boundaries -- <package>`
- `pnpm run reachability -- <package> --strict`
- `pnpm run crap -- <package>`
- `pnpm run scrap -- <package>`

Use scoped mutation for changed packages or files:

- `pnpm run mutate -- <changed source file or source directory>`

## Architecture Review Notes

The architecture pass uses the `improve-codebase-architecture` vocabulary:

- **Module**: anything with an interface and implementation.
- **Interface**: everything callers must know to use the module.
- **Depth**: leverage behind the interface.
- **Seam**: where an interface lives.
- **Adapter**: a concrete thing satisfying an interface at a seam.
- **Locality**: change, bugs, and knowledge concentrated in one place.

Candidates should be accepted only when they improve locality or leverage enough to justify the churn.

## Status

- Setup: complete.
- Baseline gates: complete.
- Architecture candidates: complete for this pass.
- Implementation: complete for this pass.
- Final local validation: complete.
- Final CI: pending after docs push.

## Completed Baseline

- `pnpm install`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`

All broad baseline gates passed before cleanup work started.

## Package Quality Sweep

The all-package sweep covered:

- `pnpm run organize -- <package>`
- `pnpm run boundaries -- <package>`
- `pnpm run reachability -- <package> --strict`
- `pnpm run crap -- <package>`
- `pnpm run scrap -- <package>`

Initial hard reachability failures:

- `packages/extension`
- `packages/codegraphy-mcp`

`packages/codegraphy-mcp` was missing its CLI entrypoint in `quality.config.json`.

`packages/extension` had a mix of real dead surfaces and hidden public barrel entrypoints:

- Real dead surfaces removed:
  - old settings-panel filter section
  - legacy graph-control filtering facade
  - legacy search filter graph
  - duplicate structural-edge builders now owned by `shared/visibleGraph/structure.ts`
  - duplicate webview search matching now owned by `shared/visibleGraph/search.ts`
- Entrypoints documented in `quality.config.json`:
  - `src/core/graphQuery/index.ts`
  - `src/shared/visibleGraph/index.ts`

Retested after cleanup:

- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- codegraphy-mcp/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/shared/graphControls tests/shared/visibleGraph tests/webview/search tests/webview/settingsPanel`: pass, 42 files / 221 tests
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/rules.test.ts`: pass
- `pnpm run mutate -- extension/src/extension/pipeline/rules.ts`: pass, 100% mutation score, 0 survivors
- `pnpm run lint`: pass
- `pnpm run typecheck`: pass

`packages/extension` CRAP still reports existing over-threshold functions. The next cleanup slice will work from the highest-leverage entries rather than mixing that larger refactor into the dead-surface commit.

## Graph Query Cleanup Slice

Architecture candidate: `packages/extension/src/core/graphQuery`.

Why this slice:

- `pnpm run crap -- extension/` flagged multiple Graph Query report helpers above the CRAP threshold.
- `pnpm run reachability -- extension/ --strict` required `src/core/graphQuery/index.ts` to be treated as a public entrypoint, which makes Graph Query an explicit interface.
- The existing tests covered happy paths but mutation showed the report interface was not defending filtering, sorting, relation grouping, and path-limit behavior strongly enough.

Changes made:

- Replaced the `executeGraphQuery` report switch with a report-handler table.
- Split Graph Query branch logic into named helpers for filter normalization, relationship symbol selection, and path collection.
- Added file-mapped tests for:
  - `execute.ts`
  - `filter.ts`
  - `pagination.ts`
  - `sort.ts`
  - `visible.ts`
- Expanded public report tests for paths, relationships, reports, and symbols.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/core/graphQuery`: pass, 9 files / 54 tests
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run crap -- extension/src/core/graphQuery`: pass, all functions CRAP <= 8
- `pnpm run boundaries -- extension/src/core/graphQuery`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run lint`: pass after restoring scalar-only filter normalization

Scoped mutation history:

- First `pnpm run mutate -- extension/src/core/graphQuery`: 66.67% mutation score and 6 files over the 50 mutation-site threshold.
- After Graph Query tests and refactors: 85.57% mutation score.
- Current module scores above 90%: `execute.ts`, `filter.ts`, `pagination.ts`, `paths.ts`, `symbols.ts`, `visible.ts`.
- Remaining below-standard areas are concentrated in `relationships.ts`, `reports.ts`, `sort.ts`, and a few equivalent-looking nullish/default branches.
- The mutation-site threshold still flags `relationships.ts`, `symbols.ts`, `paths.ts`, `reports.ts`, and `visible.ts`; next cleanup should split the larger report modules into deeper modules before expecting the directory-level mutation score to clear 90%.

## Graph Controls Filtering Test Slice

Architecture candidate: `packages/extension/src/webview/graphControls/filtering`.

Why this slice:

- `pnpm run crap -- extension/` flagged `filterSemanticEdges` as over the CRAP threshold because the module had weak direct coverage.
- This filtering module is a small but important webview boundary: it decides which graph nodes, semantic edges, structural edges, and decorations survive user visibility settings.
- Improving the test surface here reduces risk before deeper UI architecture cleanup.

Changes made:

- Added file-mapped tests for:
  - `edges.ts`
  - `nodes.ts`
- Covered disabled edge types, visible endpoints, structural edge visibility, edge default colors, visible edge decorations, default file-node typing, node-type color precedence, and file/folder partitions.
- Added one mocked-defaults test for the node-type fallback contract because folder and generic fallback colors currently share the same hex value.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graphControls/filtering`: pass, 2 files / 12 tests
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/webview/graphControls/filtering`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/webview/graphControls/filtering`: pass, all functions CRAP <= 8; `edges.ts` and `nodes.ts` at 100% statements, branches, functions, and lines
- `pnpm run mutate -- extension/src/webview/graphControls/filtering`: pass, 100% mutation score, 71 killed, 0 survivors
- `pnpm run lint`: pass

## Tree-sitter JavaScript Type Import Slice

Architecture candidate: `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript`.

Why this slice:

- `pnpm run crap -- extension/` flagged `visitJavaScriptNode` and `handleJavaScriptImportStatement`.
- The JavaScript import analyzer treated type-only imports as an extension of the value-import path, which made the import module shallow and harder to test.
- Scoped mutation on the first extracted type-import module showed 144 mutation sites and a 75.69% score, so the first split was still too broad.

Changes made:

- Replaced the JavaScript node visitor switch with a visitor table in `file.ts`.
- Split type-import analysis into a small feature folder:
  - `typeImports/clause.ts` locates import clauses and named import specifiers.
  - `typeImports/markers.ts` detects top-level and inline `type` markers.
  - `typeImports/binding.ts` turns syntax nodes into imported type bindings.
  - `typeImports/collect.ts` orchestrates statement-level type binding collection.
- Kept value-import and type-import relation emission separate in `imports.ts`.
- Added file-mapped tests for each type-import module, plus integration assertions in the JavaScript import tests.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/treesitter/javascript/typeImports tests/extension/pipeline/treesitter/javascript/imports.test.ts tests/extension/pipeline/treesitter/analyze.test.ts`: pass, 6 files / 37 tests
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm --filter @codegraphy/extension exec eslint src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript tests/extension/pipeline/treesitter/javascript/typeImports tests/extension/pipeline/treesitter/javascript/imports.test.ts`: pass
- `pnpm run boundaries -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/binding.ts`: pass, 100% mutation score, 46 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/clause.ts`: pass, 100% mutation score, 29 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/markers.ts`: pass, 100% mutation score, 15 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/collect.ts`: pass, 100% mutation score, 39 killed, 0 survivors, under mutation-site threshold

## Tree-sitter Runtime Dispatch Slice

Architecture candidate: `packages/extension/src/extension/pipeline/plugins/treesitter/runtime`.

Why this slice:

- `pnpm run crap -- extension/` flagged `analyzeTreeSitterTree`, `handleCFamilySymbol`, `handleHaskellDeclaration`, and `getStringSpecifier`.
- The runtime analyzer was carrying multiple language and syntax dispatch decisions inside broad switch or if chains.
- C-family symbol extraction had one large mutation surface, which made it harder to isolate tests for name lookup, symbol emission, and syntax-node dispatch.

Changes made:

- Replaced the runtime language `if` chain with a `TREE_SITTER_FILE_ANALYZERS` table.
- Split string literal specifier extraction into a small reader table plus focused helpers.
- Split C-family symbol handling into:
  - `model.ts` for handler context contracts
  - `names.ts` for syntax-node name discovery
  - `emit.ts` for relation/symbol emission
  - `handlers.ts` for node-type dispatch
  - `symbols.ts` as the narrow public wrapper
- Added direct tests for the C-family modules, Haskell symbol declarations, and unsupported runtime analyzer languages.
- Kept the Haskell declaration dispatcher as a small switch after scoped mutation showed the table form produced low-value equivalent survivors.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/treesitter/analyze.test.ts tests/extension/pipeline/treesitter/c/analyze.test.ts tests/extension/pipeline/treesitter/cpp/analyze.test.ts tests/extension/pipeline/treesitter/haskell/analyze.test.ts tests/extension/pipeline/treesitter/stringSpecifier.test.ts`: pass, 5 files / 18 tests
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/treesitter/cfamily`: pass, 4 files / 14 tests
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/treesitter/haskell/symbols.test.ts tests/extension/pipeline/treesitter/haskell/analyze.test.ts`: pass, 2 files / 5 tests
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm --filter @codegraphy/extension exec eslint src/extension/pipeline/plugins/treesitter/runtime/analyze.ts src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily src/extension/pipeline/plugins/treesitter/runtime/analyzeHaskell/symbols.ts src/extension/pipeline/plugins/treesitter/runtime/analyze/stringSpecifier.ts tests/extension/pipeline/treesitter/analyze.test.ts tests/extension/pipeline/treesitter/cfamily tests/extension/pipeline/treesitter/haskell/symbols.test.ts`: pass
- `pnpm run boundaries -- extension/src/extension/pipeline/plugins/treesitter/runtime`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/pipeline/plugins/treesitter/runtime`: pass, all functions CRAP <= 8
- `pnpm run crap -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily`: pass, all functions CRAP <= 8
- `pnpm run crap -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeHaskell`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyze/stringSpecifier.ts`: pass, 100% mutation score, 30 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyze.ts`: pass, 100% mutation score, 10 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily/symbols.ts`: pass, 100% mutation score, 3 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily/handlers.ts`: pass, 95.45% mutation score, 21 killed, 1 survivor, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily/emit.ts`: pass, 96.67% mutation score, 29 killed, 1 survivor, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily/names.ts`: pass, 100% mutation score, 37 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeHaskell/symbols.ts`: pass, 96.97% mutation score, 32 killed, 1 survivor, under mutation-site threshold

## Visible Graph Projection And Search Slice

Architecture candidate: `packages/extension/src/shared/visibleGraph`.

Why this slice:

- `pnpm run crap -- extension/` flagged `applyStructuralProjection` at 15.0 and `getMatchingNodeIds` at 8.6.
- `shared/visibleGraph` is a public graph-shaping interface that combines scope, filters, search, orphan removal, and structural projection before the webview renders the graph.
- CodeGraphy MCP was attempted first, but the active Graph Cache was still associated with the protected main worktree instead of this agent worktree. I pivoted to source inspection for this slice rather than trusting stale graph data.

Changes made:

- Split search into:
  - `searchQuery/options.ts` for option normalization and pattern compilation
  - `searchQuery/matching.ts` for node-match collection
  - `search.ts` as the narrow `applySearch` wrapper
- Split structural projection into:
  - `structuralProjection/options.ts` for scope-derived feature flags
  - `structuralProjection/folders.ts` for folder-node projection
  - `structuralProjection/packages.ts` for workspace-package projection
  - `structuralProjection/edges.ts` for generated `nests` edges
  - `structure.ts` as the narrow `applyStructuralProjection` wrapper
- Added file-mapped tests for each new source module plus wrapper tests for `search.ts` and `structure.ts`.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/shared/visibleGraph`: pass, 9 files / 50 tests
- `pnpm --filter @codegraphy/extension exec eslint src/shared/visibleGraph tests/shared/visibleGraph`: pass
- `pnpm run boundaries -- extension/src/shared/visibleGraph`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/shared/visibleGraph`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/shared/visibleGraph/search.ts`: pass, 100% mutation score, 11 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/searchQuery/options.ts`: pass, 96.97% mutation score, 32 killed, 1 no coverage, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/searchQuery/matching.ts`: pass, 95.00% mutation score, 19 killed, 1 survivor, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/structure.ts`: pass, 90.91% mutation score, 10 killed, 1 survivor, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/structuralProjection/options.ts`: pass, 100% mutation score, 13 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/structuralProjection/folders.ts`: pass, 100% mutation score, 20 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/structuralProjection/packages.ts`: pass, 100% mutation score, 9 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/shared/visibleGraph/structuralProjection/edges.ts`: pass, 92.68% mutation score, 38 killed, 1 survivor, 2 no coverage, under mutation-site threshold

## Graph Corner Controls Zoom Slice

Architecture candidate: `packages/extension/src/webview/components/graphCornerControls`.

Why this slice:

- `pnpm run crap -- extension/` flagged `useContinuousZoomControl` at 14.6 after the visible-graph refactor.
- Continuous zoom is a small but user-facing interaction loop; pointer, keyboard, timer, and React lifecycle behavior were previously packed into one hook.
- The hook needed direct mutation coverage for blur cleanup and foreign-pointer events so the UX contract is protected independently of the rendered corner-controls view.

Changes made:

- Split continuous zoom into a feature-local `zoom/` folder:
  - `keyboard.ts` owns activation-key detection.
  - `pointer.ts` owns active pointer capture, release, and stop filtering.
  - `timers.ts` owns hold-delay and repeat scheduling.
  - `hook.ts` wires the React lifecycle and returned handlers.
- Kept `view.tsx` responsible for button rendering and message posting only.
- Replaced the broad hook test with file-mapped tests for each module plus view-level regression coverage for the real buttons.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graphCornerControls`: pass, 5 files / 27 tests
- `pnpm --filter @codegraphy/extension exec eslint src/webview/components/graphCornerControls tests/webview/graphCornerControls`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/webview/components/graphCornerControls`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/webview/components/graphCornerControls`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/webview/components/graphCornerControls/zoom/keyboard.ts`: pass, 100% mutation score, 7 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/webview/components/graphCornerControls/zoom/pointer.ts`: pass, 100% mutation score, 15 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/webview/components/graphCornerControls/zoom/timers.ts`: pass, 100% mutation score, 11 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/webview/components/graphCornerControls/zoom/hook.ts`: pass, 95.00% mutation score, 19 killed, 1 survivor, under mutation-site threshold

## Repo Settings Freshness Slice

Architecture candidate: `packages/extension/src/extension/repoSettings/freshness`.

Why this slice:

- `pnpm run crap -- extension/` flagged `evaluateCodeGraphyIndexStatus` at 10.3 and `createStaleDetail` at 8.6.
- The index-freshness policy is part of the Graph Cache trust boundary; it decides whether the saved index can be reused, whether changed files are pending, and which stale detail the user sees.
- A first refactor passed mutation score but still left 104 mutation sites in one file, so the feature needed a real module split instead of only extra tests.

Changes made:

- Split freshness into a feature-local folder:
  - `model.ts` owns the freshness and stale-reason contracts.
  - `details.ts` owns user-facing fresh, missing, and stale detail messages.
  - `reasons.ts` owns signature and commit stale-reason collection.
  - `index.ts` owns the public `evaluateCodeGraphyIndexStatus` orchestration.
- Added `src/extension/repoSettings/freshness/index.ts` as an explicit quality-tool entrypoint.
- Moved the wrapper test into `tests/extension/repoSettings/freshness/index.test.ts` and added file-mapped tests for detail and reason behavior.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/repoSettings/freshness`: pass, 3 files / 18 tests
- `pnpm --filter @codegraphy/extension exec eslint src/extension/repoSettings/freshness tests/extension/repoSettings/freshness`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/extension/repoSettings/freshness`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/repoSettings/freshness`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/extension/repoSettings/freshness`: pass, 100% mutation score, 87 killed, 0 survivors, 0 no coverage, every file under mutation-site threshold

## Workspace Files Refresh Watchers Slice

Architecture candidate: `packages/extension/src/extension/workspaceFiles/refresh`.

Why this slice:

- `pnpm run crap -- extension/` flagged one anonymous workspace-file watcher callback at 8.1 after the repo-settings freshness split.
- Workspace refresh is a core extension boundary: saved documents, file-system watcher events, workspace explorer events, and rename events all feed the Graph Cache refresh scheduler.
- The watcher module mixed VS Code subscription wiring with refresh policy and event emission, which made the callback behavior harder to inspect and mutate directly.

Changes made:

- Kept `watchers.ts` focused on registering VS Code subscriptions and binding log messages/event names.
- Added `operations.ts` for the refresh policy:
  - saved-document refresh
  - file create/delete refresh
  - workspace explorer create/delete refresh
  - rename refresh and event emission
- Added file-mapped tests for both watcher wiring and operation behavior, including ignored saves, ignored file operations, ignored renames, and emitted workspace events.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/workspaceFiles/refresh`: pass, 4 files / 27 tests
- `pnpm --filter @codegraphy/extension exec eslint src/extension/workspaceFiles/refresh tests/extension/workspaceFiles/refresh`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/extension/workspaceFiles/refresh`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/workspaceFiles/refresh`: pass, all functions CRAP <= 8

Scoped mutation:

- `pnpm run mutate -- extension/src/extension/workspaceFiles/refresh/watchers.ts`: pass, 100% mutation score, 19 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/workspaceFiles/refresh/operations.ts`: pass, 100% mutation score, 35 killed, 0 survivors, under mutation-site threshold

## Discovery File Walker Slice

Architecture candidate: `packages/extension/src/core/discovery/file/walk.ts`.

Why this slice:

- `pnpm run crap -- extension/` flagged `walkDirectory` at 10.0 after the workspace refresh split.
- The exported walker is a low-level discovery interface, but path resolution, unreadable directory handling, skip rules, file callbacks, directory callbacks, recursion, and abort checks all lived in one loop.
- Mutation initially found surviving skipped-directory and unreadable-directory branches, so this slice needed test tightening rather than only a mechanical helper extraction.

Changes made:

- Kept the `walkDirectory` overload and `true`/`false` traversal contract stable.
- Added named helpers for:
  - overload option resolution
  - directory entry reads
  - entry path resolution
  - child-directory traversal
  - individual entry dispatch
- Made unreadable directories explicit as an empty entry list.
- Added direct tests for directory notifications, fifth-argument abort-signal handling, and skipped-directory read avoidance.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/core/discovery/file/walk.test.ts`: pass, 1 file / 13 tests
- `pnpm --filter @codegraphy/extension exec eslint src/core/discovery/file/walk.ts tests/core/discovery/file/walk.test.ts`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/core/discovery/file`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/core/discovery/file`: pass, all functions CRAP <= 8

Scoped mutation:

- First `pnpm run mutate -- extension/src/core/discovery/file/walk.ts`: pass at 92.31%, but left 3 survivors.
- After tightening tests and the unreadable-directory helper: `pnpm run mutate -- extension/src/core/discovery/file/walk.ts`: pass, 100% mutation score, 35 killed, 0 survivors, under mutation-site threshold

## Workspace File Analysis Slice

Architecture candidate: `packages/extension/src/extension/pipeline/fileAnalysis`.

Why this slice:

- `pnpm run crap -- extension/` flagged `analyzeWorkspaceFiles` at 9.0 after the discovery walker split.
- The file-analysis runner is the narrow workspace-analysis loop that turns discovered files into per-file analysis, cache updates, progress events, processed-file payloads, and symbol-enriched relations.
- A first helper extraction lowered CRAP, but scoped mutation exposed a test-mapping issue and an over-broad enrichment module:
  - `run.ts` first reported 0% mutation because the behavior test still imported the compatibility facade, so Stryker did not map the test to the new runner module.
  - `enrichment.ts` first reported 89.39% mutation and 66 mutation sites, over the 50-site threshold.

Changes made:

- Kept `fileAnalysis.ts` as the compatibility facade for existing callers.
- Split the implementation into a feature-local folder:
  - `types.ts` owns the runner contracts.
  - `run.ts` owns cache hit/miss processing, progress events, processed-file payloads, and cache updates.
  - `enrichment.ts` owns workspace-level relation enrichment orchestration.
  - `symbols.ts` indexes symbols by owning file path.
  - `targetSymbol.ts` owns relation-level target-symbol enrichment.
  - `targetSymbolName.ts` owns metadata-to-symbol-name resolution and unique target selection.
- Moved the runner behavior tests to `tests/extension/pipeline/fileAnalysis/run.test.ts` and imported `run.ts` directly so mutation maps to the module under test.
- Added file-mapped tests for enrichment, symbol indexing, relation target enrichment, and target symbol-name resolution.
- Removed a redundant defensive cache branch once mutation showed it guarded an unreachable state under the runner's own cache-write invariant.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/fileAnalysis`: pass, 5 files / 24 tests
- `pnpm --filter @codegraphy/extension exec eslint src/extension/pipeline/fileAnalysis.ts src/extension/pipeline/fileAnalysis tests/extension/pipeline/fileAnalysis`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/extension/pipeline/fileAnalysis`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/pipeline/fileAnalysis`: pass, all functions CRAP <= 8

Scoped mutation:

- After moving `run.test.ts` and removing the redundant cache branch: `pnpm run mutate -- extension/src/extension/pipeline/fileAnalysis/run.ts`: pass, 100% mutation score, 47 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/fileAnalysis/enrichment.ts`: pass, 100% mutation score, 7 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/fileAnalysis/targetSymbolName.ts`: pass, 100% mutation score, 42 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/fileAnalysis/targetSymbol.ts`: pass, 100% mutation score, 12 killed, 0 survivors, under mutation-site threshold
- `pnpm run mutate -- extension/src/extension/pipeline/fileAnalysis/symbols.ts`: pass, 100% mutation score, 5 killed, 0 survivors, under mutation-site threshold

## Agent Bridge URI Slice

Architecture candidate: `packages/extension/src/extension/agentBridge/uri.ts`.

Why this slice:

- The agent URI bridge is the extension-host interface that lets outside agent tooling ask VS Code to index or query the active repo.
- The previous single file mixed URI action parsing, request-file IO, workspace guards, provider dispatch, response writing, and VS Code handler wiring.
- Scoped mutation reported 113 mutation sites in the one file, above the repo threshold of 50, and an 83.33% mutation score. The bridge needed a deeper public interface with file-mapped behavior tests.

Changes made:

- Kept `src/extension/agentBridge/uri.ts` as the compatibility barrel for existing imports.
- Split the implementation into a feature-local folder:
  - `types.ts` owns the bridge contracts and response shapes.
  - `dependencies.ts` adapts VS Code workspace, message, and request/response file IO.
  - `paths.ts` owns platform-aware repo path normalization.
  - `request.ts` owns URI action and request-file parsing.
  - `workspace.ts` owns active-workspace validation and failure responses.
  - `actions.ts` owns index/query provider dispatch and error responses.
  - `handle.ts` owns request orchestration order.
  - `handler.ts` owns the VS Code `UriHandler` adapter.
  - `response.ts` owns failed-response construction.
- Added file-mapped tests for each module and retained end-to-end bridge tests for public behavior and exact user-facing failure messages.

Validation:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/agentBridge/uri.test.ts tests/extension/agentBridge/uri`: pass, 9 files / 34 tests
- `pnpm --filter @codegraphy/extension exec eslint src/extension/agentBridge/uri.ts 'src/extension/agentBridge/uri/**/*.ts' tests/extension/agentBridge/uri.test.ts 'tests/extension/agentBridge/uri/**/*.ts'`: pass
- `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.tests.json`: pass
- `pnpm run boundaries -- extension/src/extension/agentBridge/uri`: pass, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- extension/ --strict`: pass, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- extension/src/extension/agentBridge/uri`: pass, all functions CRAP <= 8
- `pnpm run mutate -- extension/src/extension/agentBridge/uri`: pass, 100% mutation score, 111 killed, 0 survivors, 0 no coverage, every file under mutation-site threshold

## Final Documentation Pass

Docs updated after the cleanup:

- `README.md` now describes the package map as Core Extension, MCP, Plugin API, language plugins, and quality tools.
- `docs/README.md` now gives a repo-wide package orientation and links each package class to its starting docs.
- `packages/extension/docs/boundaries.md` now names the current extension source ownership areas, including agent URI handling, Graph Query, Visible Graph projection, repo settings freshness, workspace refresh, and webview feature folders.
- `docs/quality/README.md` now documents repo-root quality-tool targets and scoped mutation expectations.

No changeset was added because the branch contains internal refactors, tests, and docs without a user-facing release behavior change.

## Final Local Validation

Broad gates:

- `pnpm run lint`: pass
- `pnpm run typecheck`: pass
- `pnpm run test`: pass, 17 turbo tasks plus 11 release tests
- `pnpm run build`: pass, 15 turbo tasks

Repo-wide quality tools:

- `pnpm run organize -- .`: pass, advisory structure output only
- `pnpm run boundaries -- . --strict`: pass, 1,212 files, 0 layer violations, 0 dead surfaces, 0 dead ends
- `pnpm run reachability -- . --strict`: pass, 1,212 files, 0 dead surfaces, 0 dead ends
- `pnpm run crap -- .`: pass, all functions CRAP <= 8
- `pnpm run scrap -- .`: pass, advisory test-shape output only

Scoped mutation strategy:

- Full monorepo mutation remains intentionally expensive.
- Every changed high-risk source slice in this pass was checked with scoped mutation.
- The final changed slice, `extension/src/extension/agentBridge/uri`, passed at 100% mutation score with 111 killed mutants, 0 survivors, and every file under the 50 mutation-site threshold.
