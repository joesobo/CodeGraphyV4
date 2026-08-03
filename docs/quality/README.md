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
pnpm run scrap -- .

pnpm run boundaries -- extension/
pnpm run reachability -- extension/ --strict
pnpm run organize -- extension/
pnpm run crap -- extension/
pnpm run scrap -- extension/

# Mutation must target one source module at a time.
pnpm run mutate -- extension/src/extension/repoSettings/freshness/model.ts
```

Targets can be:

- the repo root `.` for a monorepo-wide configured-source sweep
- a package shorthand like `extension/` or `extension/src/webview/`
- a package-relative file or directory under `packages/...`
- a specific file path

Current command expectations:

- `organize` can inspect the repo root, a package root, or a narrower directory with `pnpm run organize -- <target>`
- `boundaries` can inspect the repo root, a package root, or a specific file or directory
- `reachability` can inspect the repo root, a package root, or a specific file or directory
- `crap` can inspect the repo root, a package root, or a specific file or directory
- `mutate` requires one source module at a time; a bare repository or package run is invalid
- `scrap` works best on package roots and test files/directories

Quality tools are diagnostics, not a required checklist for every change. Select a tool when its signal matches the current risk, then use the narrowest target that can answer the question. Repository-wide reports and mutation runs are expensive and should not block a faster relevant feedback loop.

Mutation is the most expensive quality tool. Run it only when test effectiveness needs deeper inspection, and target one changed source module. Use the survivors to improve that module or its tests, then repeat the same scoped run until the result is clean. CI's Vitest split does not automatically shard Stryker mutation runs; mutation speed still depends on target scope, Stryker incremental state, and the Vitest tests selected for the mutation target.

CRAP coverage and tool reports live under `reports/quality-tools/`.

Implementation now lives in the external `@poleski/quality-tools` package.

Extension-specific architecture and lifecycle notes live in `packages/extension/docs/`.

Run these commands with an active Node.js LTS release. `@poleski/quality-tools` requires Node 22.22.0 or newer.

## Workflow

Choose the steps that fit the change:

1. Add or update the smallest behavior test that proves the change.
2. Run the relevant quality tool against the changed file, tests, or feature seam.
3. Inspect its report and make one focused correction.
4. Repeat the same scoped command until it reports a clean result or identifies a deliberate exception.
5. Use a broader advisory scan only when the change or investigation needs repository-wide context.

CodeGraphy keeps thin monorepo wrappers and configuration. The reusable analyzers stay in `@poleski/quality-tools`.
