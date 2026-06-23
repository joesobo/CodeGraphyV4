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

Shared content read cache:

- Command: `node packages/core/bin/codegraphy.js --verbose index .`
- Wall time: `104.81s`
- File analysis: `87297ms`
- Graph Cache save: `14632ms`
- Graph Cache size: `18157568` bytes

Result:

- Cold index wall time improved from `111.03s` to `104.81s`.
- File analysis improved from `92850ms` to `87297ms` by reusing file content
  read during pre-analysis.

Godot class name metadata fast path:

- Command shape: direct Core API cold index with `userHomeDir` pointing at an
  isolated plugin cache whose package roots point at this worktree's local
  plugin packages.
- The isolated plugin cache matters because the user's real
  `~/.codegraphy/plugins.json` can point at older worktrees or globally
  installed plugin packages.
- Before command: old `extractGDScriptClassNameDeclarations` path using the
  GDScript syntax parser.
- After command: line-based class name extraction for metadata pre-analysis.
- Files: `2367`
- Nodes: `5079`
- Edges: `9110` before, `9108` after. The persisted relationship diff is only
  the changed CodeGraphy source imports/calls in `className.ts`; no workspace
  Godot facts disappeared.
- Wall time: `104.67s` before, `37.27s` after.
- File analysis: `87918ms` before, `23352ms` after.
- Graph Cache save: `14058ms` before, `11233ms` after.
- Max resident set: `2901016576` bytes before, `465518592` bytes after.
- Peak memory footprint: `4232806784` bytes before, `332065728` bytes after.

Result:

- Cold index wall time improved from `104.67s` to `37.27s`.
- File analysis improved from `87918ms` to `23352ms` by avoiding Lezer recovery
  during Godot `class_name` metadata pre-analysis.

TypeScript alias config no-scan parse:

- Command shape: same isolated plugin cache as the Godot fast path benchmark.
- Before command: TypeScript alias config parsing used
  `ts.parseJsonConfigFileContent` with `ts.sys`, which enumerates project files
  even though alias import analysis only needs `compilerOptions`.
- After command: TypeScript alias config parsing uses a parse host that can read
  config files and extended config files but returns no project file list.
- Files: `2369`; the count is higher than the Godot fast-path run because this
  iteration adds TypeScript plugin regression coverage and changeset/docs files.
- Nodes: `5081`
- Edges: `9108`
- Wall time: `37.27s` before, `17.28s` after.
- File analysis: `23352ms` before, `3697ms` after.
- Graph Cache save: `11233ms` before, `10904ms` after.
- Max resident set: `465518592` bytes before, `476708864` bytes after.
- Peak memory footprint: `332065728` bytes before, `328051904` bytes after.

Result:

- Cold index wall time improved from `37.27s` to `17.28s`.
- File analysis improved from `23352ms` to `3697ms` by skipping TypeScript
  project file enumeration during alias config parsing.

Warm Graph Cache query proxy:

- Command shape: `requestWorkspaceGraphQuery` with report `nodes` and
  `limit: 1` against the current Graph Cache.
- Wall time: `0.74s`.
- Graph Query diagnostic duration: `601ms`.
- Query graph size: `2514` nodes, `9108` edges.
- Caveat: cache status reported `stale` with `plugin-signature-changed` because
  the query status path compared against the user's real installed-plugin cache
  while the benchmark loaded an isolated plugin cache. The query still loaded
  the Graph Cache and built graph data.

Visible Graph projection benchmark:

- Command shape: `pnpm run perf:visible-graph-monorepo` against the existing
  Graph Cache with the isolated package-plugin cache used by the cold-index
  benchmark.
- Before filter optimization:
  - Warm Graph Cache graph build: `409ms`.
  - Current settings projection: `775ms` median, `933ms` p95.
  - No-filter projection: `5ms` median.
  - Folders-on Graph Scope projection: `1369ms` median, `1445ms` p95.
  - Import-edge-hidden projection: `153ms` median.
- After reusable glob matchers and skipping direct edge matching for path-only
  filters:
  - Warm Graph Cache graph build: `378ms`.
  - Current settings projection: `22ms` median, `26ms` p95.
  - No-filter projection: `5ms` median.
  - Folders-on Graph Scope projection: `31ms` median, `32ms` p95.
  - Import-edge-hidden projection: `17ms` median, `18ms` p95.
- Result:
  - Current settings projection improved from `775ms` to `22ms`.
  - Folders-on Graph Scope projection improved from `1369ms` to `31ms`.
  - Import-edge-hidden projection improved from `153ms` to `17ms`.
  - Scenario node and edge counts stayed unchanged after the filter
    optimization.

VS Code graph view benchmark:

- Command shape: `pnpm run perf:vscode-graph-view` against this worktree,
  launching Extension Development Host with local built-in plugin packages.
- Measurement target: open CodeGraphy on the monorepo, wait for the rendered
  graph stats badge, then toggle the Graph Scope `Imports` edge type through
  the real webview controls.
- First run:
  - VS Code launch: `1518ms`.
  - Open Graph View to first rendered graph stats: `57209ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `3127ms` median, `3143ms` p95 across 5 samples.
- Repeat run:
  - VS Code launch: `850ms`.
  - Open Graph View to first rendered graph stats: `9917ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `2983ms` median, `3079ms` p95 across 2 samples.
- After skipping force-graph cooldown ticks for already-positioned interactive
  graphs:
  - VS Code launch: `1408ms`.
  - Open Graph View to first rendered graph stats: `9846ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `1925ms` median, `2341ms` p95 across 5 samples.
- After passing constant 2D arrow color and position values to force-graph:
  - VS Code launch: `1419ms`.
  - Open Graph View to first rendered graph stats: `9612ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `1595ms` median, `1620ms` p95 across 5 samples.
- Fresh control after reverting the hidden-edge experiment:
  - VS Code launch: `1292ms`.
  - Open Graph View to first rendered graph stats: `9938ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `2891ms` median, `3563ms` p95 across 5 samples.
- Rejected stable-edge experiment:
  - Keeping the full rendered graph stable and hiding filtered edges through
    force-graph visibility callbacks measured `2918ms` to `2922ms` median
    across variants, so it did not improve over the same-environment control.
- After memoizing the graph viewport surface:
  - VS Code launch: `1478ms`.
  - Open Graph View to first rendered graph stats: `9753ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `1628ms` median, `2252ms` p95 across 5 samples.
- Instrumented webview-stage run before compiled legend matchers:
  - VS Code launch: `1297ms`.
  - Open Graph View to first rendered graph stats: `10167ms`.
  - Imports toggle latency: `1748ms` median, `2272ms` p95 across 5 samples.
  - Stage medians: `visibleGraph.derive` about `176ms` to `187ms`;
    `visibleGraph.applyLegendRules` about `460ms` to `490ms`;
    `graphRuntime.buildGraphData` about `4ms` to `7ms`.
- After compiling legend rule glob matchers once per legend snapshot:
  - VS Code launch: `1411ms`.
  - Open Graph View to first rendered graph stats: `7659ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `835ms` median, `846ms` p95 across 5 samples.
  - Stage medians: `visibleGraph.derive` `176.1ms`;
    `visibleGraph.applyLegendRules` `79.8ms`;
    `graphRuntime.buildGraphData` `5.4ms`.
- After skipping value-equal graph control echo updates:
  - VS Code launch: `1077ms`.
  - Open Graph View to first rendered graph stats: `7401ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `493ms` median, `497ms` p95 across 5 samples.
  - Stage medians: `visibleGraph.derive` `176.9ms`;
    `visibleGraph.applyLegendRules` `80.3ms`;
    `graphRuntime.buildGraphData` `5.4ms`.
  - Instrumented event counts showed one `visibleGraph.derive` per toggle
    sample instead of the duplicate derive work seen before this iteration.
- Rejected filter matcher cache experiment:
  - Imports toggle latency stayed flat at `494ms` median, `513ms` p95 across
    5 samples.
  - `visibleGraph.derive` stayed flat at `176.7ms` median, so recompiling
    stable filter-pattern matchers was not the browser-side bottleneck.
- After caching recent visible-graph derivations by graph data and config:
  - VS Code launch: `1081ms`.
  - Open Graph View to first rendered graph stats: `6963ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `313ms` median, `345ms` p95 across 5 samples.
  - Sampled toggles had no `visibleGraph.derive` events; the remaining stage
    medians were `visibleGraph.applyLegendRules` `81.3ms`,
    `visibleGraph.style` `4.3ms`, and `graphRuntime.buildGraphData` `5.7ms`.
- After caching recent styled and legend-applied graph stages:
  - VS Code launch: `1023ms`.
  - Open Graph View to first rendered graph stats: `6918ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `236ms` median, `270ms` p95 across 5 samples.
  - Sampled toggles had no `visibleGraph.derive`, `visibleGraph.style`, or
    `visibleGraph.applyLegendRules` events; remaining stage medians were
    `graphRuntime.buildGraphData` `5.7ms` and
    `visibleGraph.edgeDecorations` `0.3ms`.
- After rendering edge-only Graph Scope changes immediately:
  - VS Code launch: `1046ms`.
  - Open Graph View to first rendered graph stats: `6895ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle latency: `203ms` median, `226ms` p95 across 5 samples.
  - Sampled toggles emitted `graphScope.visibility.renderImmediate` instead
    of `graphScope.visibility.renderDebounced`; remaining stage medians were
    `graphRuntime.buildGraphData` `5.9ms` and
    `visibleGraph.edgeDecorations` `0.4ms`.

Interpretation:

- Headless visible graph derivation is now in the `22ms` median range, but the
  real webview initially took about `3s` to reflect a Graph Scope edge toggle.
- Skipping settled-graph simulation ticks moves the real toggle median from the
  repeat-run `2983ms` baseline to `1925ms`, a `35%` improvement, but this is
  still not editor-snappy.
- Passing arrow color and arrow position as primitive values instead of per-edge
  callbacks moves the median to `1595ms` and trims the p95 to `1620ms`.
- The same-environment control varied back to `2891ms`; memoizing the viewport
  surface moved it to `1628ms` by keeping overlay, tooltip, stats, and
  accessibility state churn from re-rendering the force-graph surface.
- Instrumentation showed the force-graph data build is small (`4ms` to `7ms`);
  the next measurable bottlenecks were legend rule application and visible
  graph derivation.
- Compiling legend glob matchers reduced the measured legend stage from roughly
  `460ms`-`490ms` per pass to about `79ms`-`83ms`, moving the real toggle
  median under `1s`.
- Skipping value-equal graph control echoes removed the extra visible graph
  derivation per toggle, moving the real Imports toggle median from `835ms` to
  `493ms`.
- Caching recent visible-graph derivations removed the remaining derive pass
  when users return to a recent Graph Scope state, moving the sampled toggle
  median from `493ms` to `313ms`.
- Caching recent styled and legend-applied graph stages removed the next
  `80ms` legend pass, moving the sampled toggle median from `313ms` to `236ms`.
- Rendering edge-only Graph Scope changes immediately removed the fixed
  debounce wait from Imports toggles, moving the sampled toggle median from
  `236ms` to `203ms`.
- The next user-facing bottleneck is the remaining render latency after graph
  data construction, not the measured data derivation or Graph Scope debounce
  stages.

Full test baseline:

- `pnpm run test`: `1523.98s` wall time
- Unit phase: `1009` test files and `6039` tests passed
- Playwright phase: `119` tests passed in `22.3m`

Raw logs are intentionally ignored under `reports/performance/`.
