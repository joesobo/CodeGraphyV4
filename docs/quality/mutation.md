# Mutation

Mutation testing measures whether tests detect intentional small faults.

Current standards:

- overall score `>= 90%`
- warning below `80%`
- per-file mutation sites `<= 50`

Examples:

```bash
pnpm run mutate -- extension/
pnpm run mutate -- extension src/webview/components/NodeTooltip.tsx
pnpm run mutate -- extension/src/webview/components/NodeTooltip.tsx
pnpm run mutate -- quality-tools/
```

`pnpm run mutate` without a package, directory, or file target is intentionally invalid. Pick the package or source scope that owns the behavior under test.

Scoped file calls can either use a repo-relative path or `PACKAGE FILE`. The `PACKAGE FILE` form resolves the file inside the package before delegating to the generic mutation runner.

Mutation scope is defined in the repo root [quality.config.json](../../quality.config.json). The Stryker config files now only carry runner settings like the Vitest config path and reporters.

Operational notes:

- The CI mutation-seed workflow is responsible for orchestrating all-package mutation refreshes. Local mutation commands require an explicit package, directory, or file target.
- Root `pnpm run mutate` is a CodeGraphy wrapper: it hydrates a missing package incremental report from the latest `main` seed, then delegates to the generic `@codegraphy/quality-tools` mutation runner.
- The local seed cache lives under the local `main` checkout at `reports/mutation/`. Feature worktrees copy package seeds from there into their own `reports/mutation/<package>/` directory and never write mutation results back to `main`.
- The first successful mutation-seed workflow on `main` may take hours. Later refreshes restore package caches and should mostly rerun changed mutants.
- The extension package uses a longer Stryker dry-run timeout because its initial instrumented Vitest startup is materially slower than a normal test run.
- The CI unit-test matrix does not automatically speed up mutation runs. Stryker launches its own Vitest runner, so local mutation speed comes from scoped targets, focused test includes, and Stryker's package-level incremental reports under `reports/mutation/<package>/`.
- The mutation runner prints a progress heartbeat every 60 seconds while Stryker is still running.
- Extension mutation defaults to two Stryker workers and reuses Vitest runners instead of restarting one after every mutant. Override with `CODEGRAPHY_STRYKER_CONCURRENCY` or `CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE` when debugging runner isolation.
- Mutation targets run directly through Stryker incremental mode without a separate typecheck preflight. Pass `--force` to rerun the mutants in scope.
- Prefer package- or file-scoped mutation runs during development.
