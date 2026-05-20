# Mutation

Mutation testing measures whether tests detect intentional small faults.

Current standards:

- overall score `>= 90%`
- warning below `80%`
- per-file mutation sites `<= 50`

Examples:

```bash
pnpm run mutate -- extension/
pnpm run mutate -- extension/src/webview/components/NodeTooltip.tsx
```

Mutation scope is defined in the repo root [quality.config.json](../../quality.config.json). Stryker orchestration now lives in `@poleski/quality-tools`; CodeGraphy only provides Vitest scope through `packages/extension/vitest.config.ts`.

Operational notes:

- `pnpm run mutate` runs all supported packages and can take hours.
- The extension package uses a longer Stryker dry-run timeout because its initial instrumented Vitest startup is materially slower than a normal test run.
- Prefer package- or file-scoped mutation runs during development.
