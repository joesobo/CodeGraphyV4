# Organize Baseline

`repo.json` is the checked-in baseline for the root `pnpm run organize` gate.
The organize tool reports advisory repo-structure findings for the whole
monorepo; the baseline lets CI fail only when a change introduces new or worse
findings.

Update it intentionally with:

```bash
pnpm run organize -- --update-baseline
```

Use `pnpm run organize -- --raw .` to inspect the full current report without
the baseline comparison.
