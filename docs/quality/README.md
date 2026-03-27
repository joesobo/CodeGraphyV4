# Quality Tools

CodeGraphy uses three complementary quality checks:

- `CRAP`: production-code complexity and coverage risk
- `Mutation`: test effectiveness against injected faults
- `SCRAP`: test-structure quality and refactor guidance

The root commands are path-first:

```bash
pnpm run crap -- extension/
pnpm run mutate -- extension/
pnpm run scrap -- extension/
```

Targets can be:

- a package shorthand like `extension/` or `quality-tools/`
- a package-relative file or directory under `packages/...`
- a specific file path

Current command expectations:

- `crap` expects a package root or a path inside `src/`
- `mutate` expects a package root or a path inside `src/`
- `scrap` works best on package roots and test files/directories

Implementation now lives in `packages/quality-tools/`.
