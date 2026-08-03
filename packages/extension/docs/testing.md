# Testing

Use the fastest test layer that can prove the changed behavior.

| Layer | Use |
|---|---|
| Vitest node | Extension host, Core, shared code, and pure runtime modules |
| Vitest webview | React behavior and browser-like integration seams |
| Playwright | Built webview behavior in CI |
| VS Code Electron | Local smoke tests in the extension host |
| Mutation | Test effectiveness for one source file |

## Fast iteration

Run one relevant Vitest file while you work:

```bash
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/graph/effects/messages.test.ts
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/graphViewProvider.bootstrap.test.ts
```

Run package checks when the change affects their scope:

```bash
pnpm --filter @codegraphy-dev/extension lint
pnpm --filter @codegraphy-dev/extension typecheck
```

## Playwright acceptance

Use Playwright when the behavior depends on the built webview or VS Code host. Build the extension, then run one generated scenario:

```bash
pnpm --filter @codegraphy-dev/extension run build:vscode
pnpm --filter @codegraphy-dev/extension exec playwright test --config playwright.vscode.config.ts --grep "Vue example"
```

The direct Playwright command uses existing build output. Run `build:vscode` first to avoid testing stale code.

Let CI run the complete suite while you continue independent work. Push checkpoints and check the pull request during development. Fix failures before the branch moves far past its last green checkpoint.

Use this command to reproduce the complete suite:

```bash
pnpm --filter @codegraphy-dev/extension run test:vscode
```


## Test organization

- Keep tests near the behavior they cover.
- Split large test files by behavior.
- Add regression coverage before changing provider lifecycle, bridge, or plugin readiness seams.
- Name mutation tests so Stryker can select them for one source file.

See the [mutation guide](../../../docs/quality/mutation.md) for mutation scope and the run loop.
