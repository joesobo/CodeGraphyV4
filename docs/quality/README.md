# Quality Tools

CodeGraphy uses five complementary quality checks:

- `Organize`: directory structure, file naming, and cohesion analysis
- `Boundaries`: dependency-layer sources and runtime/package boundary enforcement
- `Reachability`: dead surfaces and dead ends inside a package source graph
- `CRAP`: production-code complexity and coverage risk
- `Mutation`: test effectiveness against injected faults
- `SCRAP`: test-structure quality and refactor guidance

The root commands are path-first:

```bash
pnpm run boundaries -- extension/
pnpm run reachability -- extension/ --strict
pnpm run organize -- extension/
pnpm run crap -- extension/
pnpm run mutate -- extension/
pnpm run scrap -- extension/
```

Targets can be:

- a package shorthand like `extension/` or `quality-tools/`
- a package-relative file or directory under `packages/...`
- a specific file path

Current command expectations:

- `boundaries` expects a package root or a path inside a package `src/` tree
- `reachability` expects a package root or a path inside a package `src/` tree
- `crap` expects a package root or a path inside `src/`
- `mutate` expects a package root or a path inside `src/`
- `scrap` works best on package roots and test files/directories

Implementation now lives in `packages/quality-tools/`.

Extension-specific architecture and lifecycle notes live in `packages/extension/docs/`.

These commands assume the repo-pinned Node runtime from [`.nvmrc`](../../.nvmrc), currently `22.22.0` LTS. `packages/quality-tools` uses `path.matchesGlob`, so older Node versions are not supported.
