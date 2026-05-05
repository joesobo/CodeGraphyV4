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
- Architecture candidates: in progress.
- Implementation: in progress.
- Final CI: pending.

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
- `pnpm --filter @codegraphy/quality-tools exec vitest run --config vitest.config.ts tests/boundaries/selection.test.ts`: pass
- `pnpm run mutate -- quality-tools/src/boundaries/selection.ts`: pass, 100% mutation score, 0 survivors
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
