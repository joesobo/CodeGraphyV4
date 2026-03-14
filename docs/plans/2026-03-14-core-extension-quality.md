# Core Extension Quality Plan

## Goal
Raise `@codegraphy/extension` to workflow-clean state: TDD, file-scoped tests, CRAP <= 8, mutation hotspots >= 90 where feasible, regular PR updates on `refactor/core-extension-quality`.

## Subtasks
- S1 `done`: discovery/workspace/provider helper extraction, tests added, PR open.
  - tests: add/update `packages/extension/tests/core/**/*`, `packages/extension/tests/extension/**/*`, `packages/extension/tests/webview/**/*`
- S2 `done`: Graph helper extraction for interaction/tooltip flows, targeted mutation passes completed.
  - tests: add/update `packages/extension/tests/webview/graph*.test.ts`
- S3 `in_progress`: close remaining extension hotspots starting with smallest uncovered modules, then larger webview/extension files.
  - tests: add/update matching file-per-module tests for `saveSvg.ts`, `SettingsPanel.tsx`, `Graph.tsx`, `GraphViewProvider.ts`
  - S3a `done`: group settings-panel files into `settingsPanel/`, extract display section/timer helpers, and add direct tests before re-measuring mutation.
    - tests: add/update `packages/extension/tests/webview/SettingsPanelDisplaySection.test.tsx`, `packages/extension/tests/webview/SettingsPanel.test.tsx`
  - S3b `in_progress`: extract filters/groups seams next because `settingsPanel/Panel.tsx` still mutates poorly.
    - tests: add/update matching file-per-module tests for extracted settings-panel modules
    - progress: `DisplaySection.tsx` = `97.47%`, `FilterSection.tsx` = `97.33%`; remaining `Panel.tsx` work is concentrated in groups/custom-default handling
  - S3c `pending`: move to `Graph.tsx` or `GraphViewProvider.ts` based on fresh mutation data after S3a/S3b.
    - tests: add/update matching file-per-module tests for the next hottest module
- S4 `pending`: rerun package workflow gates and update PR with current state.
  - tests: full `pnpm --filter @codegraphy/extension test`, `pnpm run crap -- extension`, targeted/package mutation runs, lint, typecheck

## Current hotspot order
1. `packages/extension/src/webview/components/SettingsPanel.tsx`
2. `packages/extension/src/webview/components/Graph.tsx`
3. `packages/extension/src/extension/GraphViewProvider.ts`
4. `packages/extension/src/webview/lib/export/exportSvg.ts`

## Notes
- No dedicated architecture doc in this repo; use package boundaries from `AGENTS.md`/`CLAUDE.md`.
- Use subagent-style task splitting where safe, but this session has no literal subagent launcher.
