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
- The CI unit-test matrix does not automatically speed up mutation runs. Stryker launches its own Vitest runner, so local mutation speed comes from scoped targets, focused test includes, and Stryker's package-level incremental reports under `reports/mutation/<package>/`.
- The mutation runner prints a progress heartbeat every 60 seconds while Stryker is still running.
- Extension mutation defaults to two Stryker workers and reuses Vitest runners instead of restarting one after every mutant. Override with `CODEGRAPHY_STRYKER_CONCURRENCY` or `CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE` when debugging runner isolation.
- File-scoped mutation targets skip the preflight typecheck by default to keep the local loop short. They still run through Stryker incremental mode so focused runs can warm the package-level incremental report. Pass `--force` to rerun the mutants in scope.
- Package and directory targets still run the preflight typecheck.
- Prefer package- or file-scoped mutation runs during development.
