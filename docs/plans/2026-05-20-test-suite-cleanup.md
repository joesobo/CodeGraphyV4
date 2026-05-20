# Test Suite Cleanup

## Goal

Make test commands easier to understand from the root and from each package.

The target shape is:

- `test` means Vitest/unit-level tests for a package.
- `test:playwright` means browser tests for packages that have browser behavior.
- `test:vscode` means VS Code Electron extension-host tests for packages that need the real VS Code API.
- Root scripts compose package scripts instead of carrying package-specific details.
- Mutation testing stays a local quality-tool workflow that runs against Vitest, not Playwright or VS Code E2E.

## Current Problems

- Root `package.json` mixes Vitest, release-contract tests, Playwright, VS Code E2E, watch helpers, and package-specific aliases.
- The names `test:e2e` and `test:playwright` are easy to confuse. Playwright currently tests the built webview in a browser; VS Code E2E launches Electron with the extension loaded.
- Release tests under `tests/release` are separate from package test ownership and are candidates for removal or replacement with clearer build/package checks.
- Plugin packages do not yet have even coverage depth. Some packages have substantial parser/path tests, while several only have a smoke plugin test.
- CI currently runs Vitest/release tests and Playwright, but not the VS Code Electron suite.

## Proposed Shape

Root scripts:

- `test` runs the full test suite that CI should trust.
- `test:unit` runs all package Vitest suites through Turbo.
- `test:playwright` runs package Playwright suites.
- `test:vscode` runs the VS Code Electron suite.

Package scripts:

- Keep `test` for Vitest in every package except `@codegraphy/plugin-api`.
- Keep `test:playwright` only where browser tests exist.
- Keep `test:vscode` only in `@codegraphy/extension`.
- Keep mutation and architecture-analysis tools under `@codegraphy/quality-tools`.

## First Slice

1. Rename root/package scripts so `e2e` becomes explicit `test:vscode`.
2. Remove root release-test wiring and the `tests/release` suite.
3. Update CI so the default test path includes unit, Playwright, and VS Code tests.
4. Preserve quality-tool commands as explicit local analysis tools.

## First Slice Decisions

- Root `pnpm test` now composes `test:unit`, `test:playwright`, and `test:vscode`.
- Playwright remains the browser/webview lane; VS Code E2E is the Electron extension-host lane.
- The root release checks and `tests/release` suite are removed. The release workflow packages/publishes artifacts; CI owns lint, typecheck, tests, and build.
- `@codegraphy/extension` owns all three test lanes because it has Vitest, browser, and VS Code behavior.
- Other packages expose only Vitest through `test` unless they grow a real browser or VS Code test surface.
- Mutation tooling stays in `@codegraphy/quality-tools` and continues to target Vitest, not Playwright or VS Code E2E.

## Follow-Up Slices

- Add meaningful Vitest coverage for the thin plugin packages.
- Decide whether any plugin package needs Playwright tests, or whether plugin browser behavior should stay covered through extension/webview integration.
- Keep mutation runs scoped to Vitest targets so the mutation loop stays fast enough for local TDD.
