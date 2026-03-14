# Core Extension Quality Plan

## Goal
Raise `@codegraphy/extension` to workflow-clean state: TDD, file-scoped tests, CRAP <= 8, mutation hotspots >= 90 where feasible, regular PR updates on `refactor/core-extension-quality`.

## Subtasks
- S1 `done`: discovery/workspace/provider helper extraction, tests added, PR open.
  - tests: add/update `packages/extension/tests/core/**/*`, `packages/extension/tests/extension/**/*`, `packages/extension/tests/webview/**/*`
- S2 `done`: Graph helper extraction for interaction/tooltip flows, targeted mutation passes completed.
  - tests: add/update `packages/extension/tests/webview/graph*.test.ts`
- S3 `in_progress`: close remaining extension hotspots starting with smallest uncovered modules, then larger webview/extension files.
  - tests: add/update matching file-per-module tests for `saveSvg.ts`, `settingsPanel/**/*`, `Graph.tsx`, `GraphViewProvider.ts`
  - S3a `done`: group settings-panel files into `settingsPanel/`, extract display section/timer helpers, and add direct tests before re-measuring mutation.
    - tests: add/update `packages/extension/tests/webview/SettingsPanelDisplaySection.test.tsx`, `packages/extension/tests/webview/SettingsPanel.test.tsx`
  - S3b `in_progress`: finish the settings-panel breakup until each extracted module is mutation-clean.
    - tests: add/update matching file-per-module tests for extracted settings-panel modules
    - progress:
      - folder regrouping landed: `settingsPanel/display/*`, `settingsPanel/filters/*`, `settingsPanel/groups/*`
      - focused tests passing: `128` settings-panel tests green after the rename/extraction pass
      - latest targeted mutation:
        - settings-panel slice overall = `92.21%`
        - `Panel.tsx` = `100%`
        - `SectionHeader.tsx` = `100%`
        - `groups/Section.tsx` = `100%`
        - `groups/useEditorState.ts` = `90.91%`
        - `groups/model.ts` = `97.18%`
        - `groups/Custom.tsx` = `84.62%`
        - `groups/Defaults.tsx` = `88.68%`
        - `forces/Section.tsx` = `83.67%`
        - `display/Section.tsx` = `94.94%`
        - `filters/Section.tsx` = `97.33%`
      - package gate status after this pass:
        - `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.json` passed
        - `pnpm --filter @codegraphy/extension run lint` passed
        - `pnpm run crap -- extension` still fails on pre-existing large hotspots led by `Graph.tsx` and `GraphViewProvider.ts`
      - next cut: move off settings-panel and attack `Graph.tsx` / `GraphViewProvider.ts` CRAP + mutation hotspots
  - S3c `in_progress`: split `Graph.tsx` / `GraphViewProvider.ts` effect and message blocks into direct-test helpers.
    - tests: add/update `packages/extension/tests/webview/graph/effects/*.test.ts` and `packages/extension/tests/extension/graphView/messages/*.test.ts`
    - progress:
      - extracted webview graph effect runners: `graph/effects/contextMenu.ts`, `interaction.ts`, `keyboard.ts`, `messages.ts`
      - extracted extension graph-view message helpers: `graphView/messages/plugin.ts`, `graphView/messages/ready.ts`
      - focused verification green:
        - `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/graphView/messages/plugin.test.ts tests/extension/graphView/messages/ready.test.ts tests/webview/graph/effects/contextMenu.test.ts tests/webview/graph/effects/interaction.test.ts tests/webview/graph/effects/keyboard.test.ts tests/webview/graph/effects/messages.test.ts`
        - `pnpm --filter @codegraphy/extension exec tsc --noEmit -p tsconfig.json`
      - next cut: rerun `crap` / targeted mutation and decide whether `Graph.tsx` or `GraphViewProvider.ts` gets the next split
      - tooling follow-up: make `scripts/run-mutate.ts` accept extension slices so hot files can be iterated without full-package Stryker runs
      - latest package gate status:
        - `pnpm run crap -- extension` passed
        - `pnpm run mutate -- extension graph-view-messages` = `97.80%`
        - graph-view message slice now stays under the 50-site file threshold
      - tooling landed:
        - `scripts/run-mutate.ts` now supports `pnpm run mutate -- extension <slice>`
        - `pnpm exec tsx scripts/run-mutate.ts --list-slices` prints available extension slices
- S4 `pending`: rerun package workflow gates and update PR with current state.
  - tests: full `pnpm --filter @codegraphy/extension test`, `pnpm run crap -- extension`, targeted/package mutation runs, lint, typecheck

## Current hotspot order
1. `packages/extension/src/webview/components/Graph.tsx`
2. `packages/extension/src/extension/GraphViewProvider.ts`
3. `packages/extension/src/webview/lib/export/exportSvg.ts`
4. `packages/extension/src/webview/components/Timeline.tsx`

## Notes
- No dedicated architecture doc in this repo; use package boundaries from `AGENTS.md`/`CLAUDE.md`.
- Use subagent-style task splitting where safe, but this session has no literal subagent launcher.
