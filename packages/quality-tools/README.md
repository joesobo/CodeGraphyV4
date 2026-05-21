# Quality Tools

`@codegraphy/quality-tools` holds the repo's quality tooling:

- `Boundaries` for dependency-layer sources and dead-surface detection
- `Organize` for directory structure, file naming, and cohesion analysis
- `CRAP` for production-code complexity and coverage risk
- mutation testing orchestration and mutation-site checks
- `SCRAP` for test-structure quality, duplication pressure, and refactor guidance
- `SCRAP` policy presets default to advisory mode; use `--policy review`, `--policy split`, or `--policy strict` for enforcement

Root commands stay path-first:

```bash
pnpm run boundaries -- quality-tools/
pnpm run organize -- quality-tools/
pnpm run crap -- quality-tools/
pnpm run mutate -- quality-tools/
pnpm run scrap -- quality-tools/
pnpm run scrap -- quality-tools/ --write-baseline
pnpm run scrap -- quality-tools/ --compare reports/scrap/quality-tools.json --verbose
pnpm run scrap -- quality-tools/ --policy split
pnpm run scrap -- quality-tools/ --policy review
```

Mutation target forms:

```bash
pnpm run mutate -- plugin-csharp/  # one package
pnpm run mutate -- packages/plugin-csharp/src/parserContent.ts  # one file
pnpm run mutate -- packages/extension/src/webview/vscodeApi.ts
pnpm run mutate -- extension src/webview/vscodeApi.ts
```

Mutation requires an explicit package, directory, or file target. Do not run bare `pnpm run mutate`; all-package mutation refresh belongs to the CI seed workflow.

At the CodeGraphy repo root, `pnpm run mutate` is a repo-specific wrapper. It hydrates a missing package incremental report from the latest `main` mutation seed, then delegates to the generic `@codegraphy/quality-tools` mutation runner. The generic package-local command remains seed-policy-free for future extraction.

The mutation configs ignore heavyweight local artifacts like package-local `.vscode-test/` folders and `.stryker-tmp/`, so downloaded VS Code test bundles do not get copied into Stryker sandboxes.

For extension mutation loops, the shared Stryker config defaults to two workers and infinite Vitest runner reuse. File-scoped targets skip the preflight typecheck by default and still run through Stryker incremental mode, so focused runs can warm the package-level incremental report used by later package or directory runs. Package and directory targets still run the preflight typecheck. Override `CODEGRAPHY_STRYKER_CONCURRENCY` or `CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE` if a focused run needs different isolation, or pass `--force` to rerun the mutants in scope.

While Stryker is running, the mutation wrapper prints a progress heartbeat every 60 seconds so long package-scoped runs do not look stalled.

Documentation lives in the repo docs:

- [docs/quality/boundaries.md](../../docs/quality/boundaries.md)
- [docs/quality/README.md](../../docs/quality/README.md)
- [docs/quality/workflow.md](../../docs/quality/workflow.md)
- [docs/quality/organize.md](../../docs/quality/organize.md)
- [docs/quality/crap.md](../../docs/quality/crap.md)
- [docs/quality/mutation.md](../../docs/quality/mutation.md)
- [docs/quality/scrap.md](../../docs/quality/scrap.md)

Config ownership:

- [quality.config.json](../../quality.config.json) is the source of truth for per-tool include and exclude scope
- [stryker.config.cjs](../../stryker.config.cjs) holds the shared Stryker runtime for extension and workspace-package mutation runs
- [packages/extension/vitest.config.ts](../extension/vitest.config.ts) switches into mutation-compatible mode when Stryker sets `CODEGRAPHY_VITEST_SCOPE` or `CODEGRAPHY_VITEST_INCLUDE_JSON`
- [packages/quality-tools/stryker.config.json](./stryker.config.json) and [packages/quality-tools/vitest.stryker.config.ts](./vitest.stryker.config.ts) exist because `quality-tools` needs its own Vitest/Stryker runner config

Package layout:

- `src/cli/` thin command entrypoints
- `src/config/` shared quality-scope config loading
- `src/crap/` CRAP analysis and reporting
- `src/mutation/` mutation orchestration and report checks
- `src/organize/` Organize analysis and reporting
- `src/scrap/` SCRAP analysis and reporting
- `src/shared/` path, target, and workspace helpers
- `tests/` mirrors the source layout

Current SCRAP features:

- file-level `STABLE` / `LOCAL` / `SPLIT` remediation modes
- AI actionability hints such as `AUTO_REFACTOR`, `AUTO_TABLE_DRIVE`, `MANUAL_SPLIT`, and `REVIEW_FIRST`
- block-level `describe` / `context` summaries
- helper-hidden complexity tracking
- fuzzy normalized duplication across setup, assertion, and whole-example shapes
- literal-shape clustering for scalar matrix repetition
- fixture duplication for temp-resource and filesystem-heavy setup
- cohesion metrics for subject breadth, overlap, and shape diversity
- coverage-matrix and extraction-pressure heuristics
- Vitest-specific operational signals for snapshots, async waits, fake timers, env/global mutation, concurrency, and type-only assertions
- React Testing Library render/query/mutation balance signals for UI-heavy suites
- structural validation for malformed test structure
- baseline write/compare support, verbose output, optional strict gating, and block-aware extraction guidance
- policy presets: `advisory`, `split`, `review`, and `strict`, with `--strict` kept as an alias
