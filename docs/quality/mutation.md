# Mutation

Mutation testing injects small faults into one source file and measures whether the tests detect them.

CodeGraphy uses these thresholds:

- overall score `>= 90%`
- warning below `80%`
- mutation sites per file `<= 50`

## Run one file

Pass a repository-relative path:

```bash
pnpm run mutate -- extension/src/webview/components/nodeTooltip/formatters.ts
```

You can also pass a package and a package-relative path:

```bash
pnpm run mutate -- extension src/webview/components/nodeTooltip/formatters.ts
```

The command rejects repository, package, and directory targets.

## Use the report

1. Run mutation against one changed source file.
2. Inspect each survivor.
3. Improve the source code or its tests.
4. Run the same file again until the report is clean.

Mutation runs on a developer machine and does not run in CI. Stryker stores incremental reports under `reports/quality-tools/mutation/`, so another run can reuse results that the change did not affect. Pass `--force` to rerun all mutants for the file.

Stryker uses its own Vitest runner. CI test groups do not shorten a mutation run. The command prints a progress update every 60 seconds.
