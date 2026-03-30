# Testing

The package uses three layers of tests:

- unit tests for core helpers and pure runtime modules
- integration-style tests for provider and webview wiring
- mutation-focused tests for old survivor hot spots

## Current expectations

- Keep package source and package tests linted and typechecked together.
- Use targeted Vitest runs while iterating.
- Split large test files when they stop being easy to reason about.
- Keep mutation tests focused on one source file or seam at a time.
- Add regression coverage before changing provider lifecycle, bridge, or plugin readiness seams.

## Useful commands

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/runtime/events.test.tsx
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/graphViewProvider.bootstrap.test.ts
pnpm --filter @codegraphy/extension lint
pnpm --filter @codegraphy/extension typecheck
```

## Test organization

- Prefer tests near the concern they cover.
- When a test file gets too large, split it by behavior rather than by implementation detail.
- Keep mutation-specific test filenames obvious so Stryker can target them directly.
- If a package seam changes, add a regression test before broadening the implementation.
