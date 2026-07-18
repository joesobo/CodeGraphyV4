# Testing

The package uses several layers of tests:

- Vitest node tests for extension-host, core, shared, and pure runtime modules
- Vitest webview tests for React/webview behavior and browser-like integration seams
- Playwright tests for built webview behavior that should run in CI
- VS Code Electron tests for local validation of the real extension host
- mutation-focused tests for old survivor hot spots

## VS Code Playwright acceptance

Use the repository's VS Code Playwright path for Graph View acceptance work:

```bash
pnpm --filter @codegraphy-dev/extension run test:vscode
```

For a focused scenario, rebuild first and then run the generated Playwright
spec with `--grep`:

```bash
pnpm --filter @codegraphy-dev/extension run build:vscode
pnpm --filter @codegraphy-dev/extension exec playwright test --config playwright.vscode.config.ts --grep "Vue example"
```

Do not debug Graph View acceptance behavior from a raw Playwright command
against stale output. `test:vscode` regenerates acceptance specs and rebuilds
the extension first; a direct `playwright test --config playwright.vscode.config.ts`
does not. If you need to use the direct command while iterating, run
`build:vscode` immediately before it.

On macOS, the acceptance launcher must use the mock keychain path. The launcher
in `tests/acceptance/graphView/vscode.ts` owns the VS Code arguments, including
`--use-inmemory-secretstorage`, `--use-mock-keychain`, and a short `/tmp` temp
base for VS Code IPC sockets. If a "Keychain Not Found" / "Code Key" modal
appears, fix the launcher path instead of continuing through the modal.

## Current expectations

- Keep package source and package tests linted and typechecked together.
- Use targeted Vitest runs while iterating.
- Split large test files when they stop being easy to reason about.
- Keep mutation tests focused on one source file or seam at a time.
- Add regression coverage before changing provider lifecycle, bridge, or plugin readiness seams.
- Treat VS Code Electron E2E as local-only smoke coverage. CI should rely on Vitest and Playwright for merge gating.

## Useful commands

```bash
pnpm --filter @codegraphy-dev/extension test
pnpm --filter @codegraphy-dev/extension run test:node
pnpm --filter @codegraphy-dev/extension run test:webview
pnpm --filter @codegraphy-dev/extension run test:playwright
pnpm --filter @codegraphy-dev/extension run test:vscode
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/graph/effects/messages.test.ts
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/graphViewProvider.bootstrap.test.ts
pnpm --filter @codegraphy-dev/extension lint
pnpm --filter @codegraphy-dev/extension typecheck
```

CI runs extension unit tests as separate `node` and grouped `webview` Vitest lanes. The webview groups are defined in `vitest.includes.ts` because the check names should describe the behavior under test, not an arbitrary shard number.

`test:playwright` generates acceptance tests, builds the VS Code extension/webview artifacts, and runs the VS Code Playwright suite. `test:vscode` is kept as a compatibility alias for the same package-owned command.

```bash
pnpm exec turbo run test:node --filter=@codegraphy-dev/extension
CODEGRAPHY_VITEST_WEBVIEW_GROUP=graph pnpm exec turbo run test:webview --filter=@codegraphy-dev/extension
CODEGRAPHY_VITEST_WEBVIEW_GROUP=appPlugins pnpm exec turbo run test:webview --filter=@codegraphy-dev/extension
CODEGRAPHY_VITEST_WEBVIEW_GROUP=panelsExport pnpm exec turbo run test:webview --filter=@codegraphy-dev/extension
```

Mutation runs do not reuse the CI groups automatically. `pnpm run mutate -- extension/src/...` still uses Stryker's Vitest runner with focused includes, so mutation speed comes from narrowing the target and from Stryker incremental state rather than from the GitHub Actions matrix.

## Test organization

- Prefer tests near the concern they cover.
- When a test file gets too large, split it by behavior rather than by implementation detail.
- Keep mutation-specific test filenames obvious so Stryker can target them directly.
- If a package seam changes, add a regression test before broadening the implementation.
