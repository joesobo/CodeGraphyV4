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
pnpm run mutate -- quality-tools/
```

Mutation scope is defined in the repo root [quality.config.json](../../quality.config.json). The Stryker config files now only carry runner settings like the Vitest config path and reporters.

Operational notes:

- `pnpm run mutate` runs all supported packages and can take hours.
- The extension package uses a longer Stryker dry-run timeout because its initial instrumented Vitest startup is materially slower than a normal test run.
- The CI unit-test matrix does not automatically speed up mutation runs. Stryker launches its own Vitest runner, so local mutation speed comes from scoped targets, `reports/mutation/stryker-incremental*.json`, and focused test includes.
- Extension mutation defaults to two Stryker workers and reuses Vitest runners instead of restarting one after every mutant. Override with `CODEGRAPHY_STRYKER_CONCURRENCY` or `CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE` when debugging runner isolation.
- Use `--skip-typecheck` only for tight local loops after a clean `pnpm run typecheck`; it skips the preflight typecheck but still lets Stryker run the selected tests.
- Prefer package- or file-scoped mutation runs during development.
