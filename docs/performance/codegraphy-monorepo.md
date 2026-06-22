# CodeGraphy Monorepo Performance

## Baseline: 2026-06-22

Environment:

- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4/.worktrees/speed-up-codegraphy`
- Branch: `codex/speed-up-codegraphy`
- Settings: tracked `.codegraphy/settings.json` from `main`
- Runtime: Node 22 PATH, local `packages/core/bin/codegraphy.js`

Cold index from no Graph Cache:

- Command: `node packages/core/bin/codegraphy.js --verbose index .`
- Wall time: `214.04s`
- Files: `2365`
- Nodes: `5075`
- Edges: `9097`
- Graph Cache: `62MB`
- Max resident set: `2708193280` bytes
- Peak memory footprint: `4201907648` bytes

Full test baseline:

- `pnpm run test`: `1523.98s` wall time
- Unit phase: `1009` test files and `6039` tests passed
- Playwright phase: `119` tests passed in `22.3m`

Raw logs are intentionally ignored under `reports/performance/`.
