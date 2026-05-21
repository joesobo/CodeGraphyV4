# Reachability

`reachability` reports dead surfaces and dead ends inside the selected configured file graph.

## Quick start

```bash
pnpm run reachability -- extension/
pnpm run reachability -- extension/src/webview/
```

## What it checks

- dead surfaces: files with no inbound references inside the selected scope
- dead ends: files with no inbound or outbound references inside the selected scope

## Configuration

The command uses the same source-selection and entrypoint config as `boundaries` from `quality.config.json`:

- `defaults.boundaries.include` / `exclude`
- `packages.<name>.boundaries.entrypoints`

## Notes

- dead ends always fail the command
- dead surfaces fail only with `--strict`
- use `--json` for automation output
- use `--verbose` to print every analyzed file
