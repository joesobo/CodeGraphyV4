# Test Suite Cleanup

## Goal

Make test commands easier to understand from the root and from each package.

The target shape is:

- `test` means Vitest/unit-level tests for a package.
- `test:playwright` means the full Playwright command for workspace packages and apps that declare that script.
- `test:vscode` is the extension package compatibility alias for its VS Code Playwright suite.
- Root scripts compose package scripts instead of carrying package-specific details.
- Mutation testing stays a local quality-tool workflow that runs against Vitest, not Playwright or VS Code E2E.

## Original Problems

- Root `package.json` mixes Vitest, release-contract tests, Playwright, VS Code E2E, watch helpers, and package-specific aliases.
- The names `test:e2e` and `test:playwright` are easy to confuse. Playwright currently tests the built webview in a browser; VS Code E2E launches Electron with the extension loaded.
- Release tests under `tests/release` are separate from package test ownership and are candidates for removal or replacement with clearer build/package checks.
- Plugin packages do not yet have even coverage depth. Some packages have substantial parser/path tests, while several only have a smoke plugin test.
- CI currently runs Vitest/release tests and Playwright, but not the VS Code Electron suite.

## Proposed Shape

Root scripts:

- `test` runs the full test suite that CI should trust.
- `test:unit` runs all package Vitest suites through Turbo.
- `test:playwright` runs workspace package and app Playwright suites through Turbo.
- `test:vscode` remains an extension package compatibility alias.

Package scripts:

- Keep `test` for Vitest in every package except `@codegraphy-dev/plugin-api`.
- Keep `test:playwright` only where browser tests exist.
- Keep `test:vscode` only in `@codegraphy-dev/extension`.
- Keep mutation and architecture-analysis tools behind root scripts backed by `@poleski/quality-tools`.

## First Slice

1. Rename root/package scripts so `e2e` becomes explicit `test:vscode`.
2. Remove root release-test wiring and the `tests/release` suite.
3. Update CI so the default test path includes unit and Playwright tests.
4. Preserve quality-tool commands as explicit local analysis tools.

## First Slice Decisions

- Root `pnpm test` now composes `test:unit` and the Turbo-cached `test:playwright` lane.
- Playwright is the CI E2E lane for browser/webview behavior that matters before merge.
- `@codegraphy-dev/extension` owns the full VS Code Playwright generate/build/run flow in its `test:playwright` command, while root and CI only discover and invoke workspace `test:playwright` owners through Turbo.
- CI splits acceptance tests into language-example and graph-interaction shards with separate cache keys.
- The root release checks and `tests/release` suite are removed. The release workflow publishes artifacts; there is no public package-without-publish workflow.
- CI runs separate lint, typecheck, unit-test, Playwright, and build lanes so independent work is not serialized behind the slowest suite.
- Turbo caches package builds and test logs/results through task outputs and GitHub Actions restores `.turbo` between CI runs.
- `@codegraphy-dev/extension` owns all three test lanes because it has Vitest, browser, and VS Code behavior.
- Other packages expose only Vitest through `test` unless they grow a real browser or VS Code test surface.
- Mutation tooling stays in `@poleski/quality-tools` and continues to target Vitest, not Playwright or VS Code E2E.

## Current CI Shape

CI runs build, lint, typecheck, Playwright, and unit tests as independent jobs. Unit tests use a matrix with human-readable check names:

- `Unit tests / Packages` runs all package Vitest suites except `@codegraphy-dev/extension`.
- `Unit tests / Extension node` runs the extension Vitest `node` project.
- `Unit tests / Extension webview graph interaction and rendering` runs graph model, interaction, rendering, controls, and Graph Scope webview tests.
- `Unit tests / Extension webview app shell and plugins` runs webview app shell, store, plugin host/runtime, plugin panel, theme, VS Code API bridge, and webview-extension integration tests.
- `Unit tests / Extension webview panels, search, and exports` runs settings, legends, search, timeline, toolbar, generic components, tooltip, and export tests.

The current PR run target is under 3 minutes wall-clock. The webview groups are intentionally separate because the extension webview suite is the long pole once package, lint, typecheck, build, and Playwright lanes run in parallel.

## Follow-Up Slices

- Add meaningful Vitest coverage for the thin plugin packages.
- Decide whether any plugin package needs Playwright tests, or whether plugin browser behavior should stay covered through extension/webview integration.
- Keep mutation runs scoped to Vitest targets so the mutation loop stays fast enough for local TDD.
