# Mutation

Mutation testing measures whether tests detect intentional small faults.

Current standards:

- overall score `>= 90%`
- warning below `80%`
- per-file mutation sites `<= 50`

Examples:

```bash
pnpm run mutate -- extension src/webview/components/nodeTooltip/formatters.ts
pnpm run mutate -- extension/src/webview/components/nodeTooltip/formatters.ts
```

Mutation requires one source module. Bare repository, package, and directory targets are intentionally invalid.

Scoped file calls can either use a repo-relative path or `PACKAGE FILE`. The `PACKAGE FILE` form resolves the file inside the package before delegating to the generic mutation runner.

The root [quality.config.json](../../quality.config.json) defines mutation scope. `@poleski/quality-tools` provides generic Stryker orchestration. CodeGraphy keeps the monorepo wrapper and Vitest scope wiring in `scripts/mutation/`, `stryker.config.cjs`, `stryker.extension.config.cjs`, and `packages/extension/vitest.config.ts`.

Operational notes:

- Mutation testing is a local development tool and does not run in CI. Local mutation commands require one explicit source file.
- Root `pnpm run mutate` is a CodeGraphy wrapper that resolves package and test scope, then delegates to the generic `@poleski/quality-tools` mutation runner.
- Stryker stores incremental reports under `reports/quality-tools/mutation/` in the current checkout. Repeated runs of the same target can reuse unaffected mutant results from that local report.
- The extension package uses a longer Stryker dry-run timeout because its initial instrumented Vitest startup is materially slower than a normal test run.
- The CI unit-test matrix does not automatically speed up mutation runs. Stryker launches its own Vitest runner, so local mutation speed comes from scoped targets, focused test includes, and target-specific incremental reports under `reports/quality-tools/mutation/`.
- The mutation runner prints a progress heartbeat every 60 seconds while Stryker is still running.
- Extension mutation defaults to two Stryker workers and reuses Vitest runners instead of restarting one after every mutant. Override with `CODEGRAPHY_STRYKER_CONCURRENCY` or `CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE` when debugging runner isolation.
- Mutation targets run directly through Stryker incremental mode without a separate typecheck preflight. Pass `--force` to rerun the mutants in scope.
- Run mutation only for the changed source module.
