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

Phase-instrumented cold index:

- Command: `node packages/core/bin/codegraphy.js --verbose index .`
- Wall time: `213.93s`
- Files: `2367`
- Nodes: `5078`
- Edges: `9114`
- Plugin load: `542ms`
- Plugin initialization: `1ms`
- File discovery: `1900ms`
- File analysis: `88321ms`
- Graph build: `62ms`
- Graph Cache save: `122757ms`
- Metadata persistence: `4ms`
- Max resident set: `3071688704` bytes
- Peak memory footprint: `4200348736` bytes

The first measured bottlenecks are Graph Cache persistence and file/plugin
analysis. Graph construction is not currently a cold-load bottleneck for this
workspace.

Canonical Graph Cache write:

- Command: `node packages/core/bin/codegraphy.js --verbose index .`
- Wall time: `111.03s`
- Files: `2367`
- Nodes: `5078`
- Edges: `9110`
- File discovery: `1924ms`
- File analysis: `92850ms`
- Graph build: `63ms`
- Graph Cache save: `15139ms`
- Graph Cache size: `18MB`
- Max resident set: `3133194240` bytes
- Peak memory footprint: `4372432256` bytes

Result:

- Cold index wall time improved from `213.93s` to `111.03s`.
- Graph Cache save improved from `122757ms` to `15139ms`.
- Graph Cache size improved from `64638976` bytes to `18153472` bytes.

Full test baseline:

- `pnpm run test`: `1523.98s` wall time
- Unit phase: `1009` test files and `6039` tests passed
- Playwright phase: `119` tests passed in `22.3m`

Raw logs are intentionally ignored under `reports/performance/`.
