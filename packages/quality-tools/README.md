# Quality Tools

`@codegraphy/quality-tools` holds the repo's quality tooling:

- `CRAP` for production-code complexity and coverage risk
- mutation testing orchestration and mutation-site checks
- `SCRAP` for test-structure quality, duplication pressure, and refactor guidance

Root commands stay path-first:

```bash
pnpm run crap -- quality-tools/
pnpm run mutate -- quality-tools/
pnpm run scrap -- quality-tools/
pnpm run scrap -- quality-tools/ --write-baseline
pnpm run scrap -- quality-tools/ --compare reports/scrap/quality-tools.json --verbose
```

Documentation lives in the repo docs:

- [docs/quality/README.md](../../docs/quality/README.md)
- [docs/quality/workflow.md](../../docs/quality/workflow.md)
- [docs/quality/crap.md](../../docs/quality/crap.md)
- [docs/quality/mutation.md](../../docs/quality/mutation.md)
- [docs/quality/scrap.md](../../docs/quality/scrap.md)

Config ownership:

- [quality.config.json](../../quality.config.json) is the source of truth for per-tool include and exclude scope
- [stryker.config.json](../../stryker.config.json) holds the shared Stryker runtime for extension-oriented mutation runs
- [packages/quality-tools/stryker.config.json](./stryker.config.json) exists because `quality-tools` needs its own Vitest/Stryker runner config

Package layout:

- `src/cli/` thin command entrypoints
- `src/config/` shared quality-scope config loading
- `src/crap/` CRAP analysis and reporting
- `src/mutation/` mutation orchestration and report checks
- `src/scrap/` SCRAP analysis and reporting
- `src/shared/` path, target, and workspace helpers
- `tests/` mirrors the source layout

Current SCRAP features:

- file-level `STABLE` / `LOCAL` / `SPLIT` remediation modes
- AI actionability hints such as `AUTO_REFACTOR`, `AUTO_TABLE_DRIVE`, `MANUAL_SPLIT`, and `REVIEW_FIRST`
- block-level `describe` / `context` summaries
- helper-hidden complexity tracking
- fuzzy normalized duplication across setup, assertion, and whole-example shapes
- cohesion metrics for subject breadth, overlap, and shape diversity
- coverage-matrix and extraction-pressure heuristics
- Vitest-specific operational signals for snapshots, async waits, fake timers, env/global mutation, concurrency, and type-only assertions
- structural validation for malformed test structure
- baseline write/compare support and verbose output
