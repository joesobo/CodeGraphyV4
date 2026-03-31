# Mutation

Mutation testing measures whether tests detect intentional small faults.

Current standards:

- overall score `>= 90%`
- warning below `80%`
- per-file mutation sites `<= 50`

Examples:

```bash
pnpm run mutate -- extension/
pnpm run mutate -- extension/src/webview/components/NodeTooltip.tsx
pnpm run mutate -- quality-tools/
```

Mutation scope is defined in the repo root [quality.config.json](../../quality.config.json). The Stryker config files now only carry runner settings like the Vitest config path and reporters.
