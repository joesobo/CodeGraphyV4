# CRAP

CRAP measures production risk from cyclomatic complexity and low coverage.

Formula:

```text
CRAP(m) = comp(m)^2 × (1 - cov(m)/100)^3 + comp(m)
```

Current threshold:

- `CRAP <= 8`

Examples:

```bash
pnpm run crap -- extension/
pnpm run crap -- extension/src/webview/
pnpm run crap -- quality-tools/
```
