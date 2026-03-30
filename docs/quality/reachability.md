# Reachability

`reachability` reports dead surfaces and dead ends inside the analyzed package source graph.

## Quick start

```bash
pnpm run reachability -- extension/
pnpm run reachability -- extension/src/webview/
pnpm run reachability -- quality-tools/ --strict
```

## What it checks

- dead surfaces: files with no inbound references inside the analyzed package scope
- dead ends: files with no inbound or outbound source references inside the analyzed package scope

## Configuration

The command uses the same source-selection and entrypoint config as `boundaries` from `quality.config.json`:

- `defaults.boundaries.include` / `exclude`
- `packages.<name>.boundaries.entrypoints`

## Notes

- dead ends always fail the command
- dead surfaces fail only with `--strict`
- use `--json` for automation output
- use `--verbose` to print every analyzed file
