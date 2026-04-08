# Boundaries

`boundaries` checks dependency-layer sources inside a package source graph.

## Quick start

```bash
pnpm run boundaries -- extension/
pnpm run boundaries -- extension/src/webview/
pnpm run boundaries -- quality-tools/
```

## What it checks

- dependency-layer violations between configured source areas

Use `pnpm run reachability -- ...` when you want focused dead-surface and dead-end reporting.

## Configuration

The command reads `quality.config.json`:

- `defaults.boundaries.include` / `exclude` define the source file surface
- `packages.<name>.boundaries.layers` define the layer sources for that package
- `packages.<name>.boundaries.entrypoints` define files that may have no inbound edges

## Notes

- The first cut is file-graph based and path-first.
- It ignores barrel files, tests, and generated surfaces through config.
- Use `--json` when you want the raw report shape for automation.
- Use `--strict` when you want dead surfaces to fail the command, not just layer violations and dead ends.
