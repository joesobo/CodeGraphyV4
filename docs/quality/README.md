# Quality Tools

CodeGraphy uses six complementary quality checks:

- `Organize`: directory structure, file naming, and cohesion analysis
- `Boundaries`: dependency-layer sources and runtime/package boundary enforcement
- `Reachability`: dead surfaces and dead ends inside a configured file graph
- `CRAP`: production-code complexity and coverage risk
- `Mutation`: test effectiveness against injected faults
- `SCRAP`: test-structure quality and refactor guidance

The root commands are path-first:

```bash
pnpm run organize -- .
pnpm run boundaries -- . --strict
pnpm run reachability -- . --strict
pnpm run crap -- .
pnpm run mutate -- .
pnpm run scrap -- .

pnpm run boundaries -- extension/
pnpm run reachability -- extension/ --strict
pnpm run organize -- --raw extension/
pnpm run crap -- extension/
pnpm run mutate -- extension/
pnpm run scrap -- extension/
```

Targets can be:

- the repo root `.` for a monorepo-wide configured-source sweep
- a package shorthand like `extension/` or `extension/src/webview/`
- a package-relative file or directory under `packages/...`
- a specific file path

Current command expectations:

- root `organize` is an enforceable baseline-regression gate backed by `quality-baselines/organize/repo.json`
- raw `organize` can inspect the repo root, a package root, or a narrower directory with `pnpm run organize -- --raw <target>`
- `boundaries` can inspect the repo root, a package root, or a specific file or directory
- `reachability` can inspect the repo root, a package root, or a specific file or directory
- `crap` can inspect the repo root, a package root, or a specific file or directory
- `mutate` can inspect the repo root, a package root, or a specific file or directory
- `scrap` works best on package roots and test files/directories

Use scoped mutation for changed source modules during normal work. Full mutation is intentionally expensive; prefer a file or feature-folder target that maps to the behavior being changed. CI's Vitest split does not automatically shard Stryker mutation runs; mutation speed still depends on target scope, Stryker incremental state, and the Vitest tests selected for the mutation target.

CRAP coverage and tool reports live under `reports/quality-tools/`.
The organize baseline is tracked in git so root runs fail only on new or regressed structure findings.

Implementation now lives in the external `@poleski/quality-tools` package.

Extension-specific architecture and lifecycle notes live in `packages/extension/docs/`.

These commands assume the repo-pinned Node runtime from [`.nvmrc`](../../.nvmrc), currently `22.22.0` LTS. `@poleski/quality-tools` uses `path.matchesGlob`, so older Node versions are not supported.
