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
- After adding the in-webview event-delta metric to the VS Code harness:
  - VS Code launch: `1068ms`.
  - Open Graph View to first rendered graph stats: `6377ms`.
  - Initial rendered stats: `2249` nodes, `5333` connections.
  - Imports toggle wall-clock latency: `209ms` median, `219ms` p95 across
    5 samples.
  - In-webview optimistic-to-rendered latency:
    `55ms` median, `58ms` p95 across 5 samples.
- Rejected startup timeline replay reorder:
  - Tried moving cached timeline replay after graph bootstrap so first graph
    stats could render before slow timeline work.
  - VS Code launch: `1259ms`.
  - Open Graph View to first rendered graph stats regressed to `7285ms`.
  - Imports toggle wall-clock latency stayed flat at `204ms` median,
    `219ms` p95; in-webview latency was `53ms` median, `111ms` p95.
  - The change was reverted because it did not improve first graph readiness.
- After adding startup webview stage and first-ready phase instrumentation:
  - VS Code launch: `868ms`.
  - Open Graph View to first rendered graph stats: `6789ms`.
  - First-ready phases: command/open `1709ms`, acceptance-ready frame
    `5032ms`, stats wait after frame discovery `35ms`.
  - Startup webview stage medians: `visibleGraph.derive` `96ms`,
    `visibleGraph.applyLegendRules` `0ms` with `89ms` p95,
    `visibleGraph.style` `5ms`, `graphRuntime.buildGraphData` `7ms`.
  - Imports toggle wall-clock latency: `208ms` median, `243ms` p95; in-webview
    latency: `56ms` median, `61ms` p95.
- After lazy-loading the 3D graph runtime outside the default 2D webview
  bundle:
  - Default `dist/webview/index.js` dropped from `2242.28 kB` minified
    (`632.54 kB` gzip) to `819.25 kB` minified (`252.32 kB` gzip).
  - 3D code now loads through separate chunks:
    `threeDimensional-D-psWmzG.js` `694.00 kB`, `three.module-BKaKZvIP.js`
    `726.58 kB`, and `runtime-CQzzxjLZ.js` `0.25 kB`.
  - VS Code launch: `1125ms`.
  - Open Graph View to first rendered graph stats: `6936ms`, effectively flat
    against the `6789ms` startup-phase run.
  - First-ready phases: command/open `1646ms`, acceptance-ready frame
    `5189ms`, stats wait after frame discovery `40ms`.
  - Imports toggle wall-clock latency: `193ms` median, `203ms` p95; in-webview
    latency: `51ms` median, `81ms` p95.
- After adding webview startup handshake markers:
  - VS Code launch: `1538ms`.
  - Open Graph View to first rendered graph stats: `6940ms`.
  - First-ready phases: command/open `1698ms`, acceptance-ready frame
    `5184ms`, stats wait after frame discovery `13ms`.
  - Once the webview document was alive, it posted ready at `26.3ms`,
    received `GRAPH_DATA_UPDATED` at `53.5ms`, received
    `APP_BOOTSTRAP_COMPLETE` at `261.8ms`, and rendered first graph stats at
    `340.5ms`.
  - The same startup run received a second `GRAPH_DATA_UPDATED` with the same
    `5088` node / `9146` edge payload at `985.1ms`, then another bootstrap
    completion at `1291ms`.
- After skipping settled duplicate graph payload replays:
  - VS Code launch: `1337ms`.
  - Open Graph View to first rendered graph stats: `6987ms`, effectively flat
    against the `6940ms` startup-marker run because the remaining wall-clock
    bucket is still frame readiness.
  - The duplicate `5088` node / `9146` edge graph payload was received at
    `1011.3ms` and skipped at `1016.6ms`.
  - The duplicate replay no longer triggered the later visible-graph derivation,
    styling, legend, edge-decoration, or graph-runtime build pass. Startup
    event counts dropped from `6` to `5` `visibleGraph.derive` events, `4` to
    `3` `visibleGraph.style` events, and `5` to `4` graph-runtime build events.
  - Imports toggle wall-clock latency stayed in the same band at `191ms`
    median, `222ms` p95; in-webview latency was `54ms` median, `86ms` p95.
- After adding extension-host startup markers:
  - VS Code launch: `1087ms`.
  - Open Graph View to first rendered graph stats: `14305ms`; this run was
    noisy in the same remaining frame-readiness bucket.
  - First-ready phases: command/open `1752ms`, acceptance-ready frame
    `12500ms`, stats wait after frame discovery `40ms`.
  - The extension-host provider resolve path took `3ms` from
    `graphWebview.providerResolve.start` to
    `graphWebview.providerResolve.end`; `webview.html` was assigned at `2ms`
    with a `1022` byte HTML shell and `2` local resource roots.
  - Once the webview document was alive, it received a `24522` node / `20781`
    edge payload at `169.4ms`, applied `74` filter patterns in a
    `498.4ms` visible-graph derive pass, and rendered first graph stats at
    `843.3ms`.
  - Imports toggle wall-clock latency was `213ms` median, `382ms` p95; in-webview
    latency was `58ms` median, `64ms` p95.
- After combining visible-graph filter glob patterns into one matcher:
  - VS Code launch: `1074ms`.
  - Open Graph View to first rendered graph stats: `13837ms`, still dominated
    by frame readiness rather than CodeGraphy resolve/render work.
  - First-ready phases: command/open `1726ms`, acceptance-ready frame
    `12066ms`, stats wait after frame discovery `32ms`.
  - Extension-host provider resolve stayed tiny at `2ms`.
  - The startup `visibleGraph.derive` pass with `74` filters over the `24522`
    node / `20781` edge payload dropped from `498.4ms` to `244ms`.
  - First graph stats after webview document start moved from `843.3ms` to
    `586.4ms`.
  - Imports toggle wall-clock latency stayed in the same band at `228ms`
    median, `337ms` p95; in-webview latency was `58ms` median, `59ms` p95.
- After adding `codegraphy.open` command markers and extending only the
  performance harness frame wait:
  - VS Code launch: `958ms`.
  - Open Graph View to first rendered graph stats: `40497ms`; the extended
    harness wait captured an outlier that previously timed out at `20s`.
  - First-ready phases: command/open `1595ms`, acceptance-ready frame
    `38852ms`, stats wait after frame discovery `37ms`.
  - Host timeline: `command.open.start` and `command.open.dispatched` at `0ms`,
    `command.open.completed` at `38ms`, provider resolve start at `43ms`, and
    `webview.html` assignment at `45ms`.
  - Once the webview document was alive, it posted ready at `27.5ms`, received
    graph data at `95.3ms`, ran the `74`-filter visible-graph derive in
    `171.4ms`, completed app bootstrap at `1066.4ms`, and rendered stats at
    `1145.9ms`.
  - Imports toggle wall-clock latency was `185ms` median, `193ms` p95; in-webview
    latency was `48ms` median, `50ms` p95.
- After adding Playwright frame lifecycle markers and writing startup-ready
  metrics before interaction sampling:
  - VS Code launch: `743ms`.
  - Open Graph View to first rendered graph stats: `38513ms`.
  - First-ready phases: command/open `1597ms`, acceptance-ready frame
    `36867ms`, stats wait after frame discovery `36ms`.
  - Frame lifecycle: the workbench frame existed at graph open; VS Code attached
    and navigated webview frames around `1795ms`-`1983ms`; the usable
    graph-ready fake.html frame attached/navigated at `37035ms`/`37040ms`;
    Graph Stage was ready at `38464ms`.
  - Extension-host timeline still assigned `webview.html` at `63ms` after
    `codegraphy.open` started.
  - Webview document work after the usable frame started remained near `1.14s`:
    ready at `27.5ms`, graph data at `95ms`, first filtered derive at
    `671.5ms`, bootstrap at `1058.7ms`, and graph stats at `1139.7ms`.
  - Imports toggle wall-clock latency was `183ms` median, `489ms` p95; in-webview
    latency was `47ms` median, `50ms` p95.
- After skipping duplicate graph payloads while the app is waiting for initial
  bootstrap completion:
  - VS Code launch: `1172ms`.
  - Open Graph View to first rendered graph stats: `13885ms`.
  - First-ready phases: command/open `1727ms`, acceptance-ready frame
    `12108ms`, stats wait after frame discovery `38ms`.
  - Host timeline still assigned `webview.html` at `49ms` after
    `codegraphy.open` started.
  - The latest startup webview event stream had a single `GRAPH_DATA_UPDATED`
    for the `24522` node / `20781` edge payload and no second `74`-filter
    visible-graph derive before bootstrap. The first filtered derive took
    `245.6ms`, bootstrap completed at `504.1ms`, and first stats rendered at
    `597.9ms` after the usable document started.
  - Imports toggle wall-clock latency was `213ms` median, `267ms` p95; in-webview
    latency was `58ms` median, `62ms` p95.
- Rejected direct Graph View focus before the container fallback:
  - The command test covered trying `codegraphy.graphView.focus` before
    `workbench.view.extension.codegraphy`, but the measured run did not improve
    startup and the production change was reverted.
  - Open Graph View to first rendered graph stats: `39359ms`.
  - First-ready phases: command/open `1577ms`, acceptance-ready frame
    `37734ms`, stats wait after frame discovery `34ms`.
  - Host timeline still assigned `webview.html` at `50ms` after
    `codegraphy.open` started, leaving the same frame-readiness bucket.
  - Imports toggle wall-clock latency was `192ms` median, `219ms` p95; in-webview
    latency was `51ms` median, `55ms` p95.
- After deferring visible graph derivation while startup loading hides the graph,
  skipping unchanged post-load filter pattern replay, and fixing harness
  in-webview delta pairing:
  - VS Code launch: `818ms`.
  - Open Graph View to first rendered graph stats: `42234ms`.
  - First-ready phases: command/open `1732ms`, acceptance-ready frame
    `40458ms`, stats wait after frame discovery `15ms`.
  - Host timeline assigned `webview.html` at `61ms` after `codegraphy.open`
    started.
  - The startup webview event stream received graph data at `101.2ms`, skipped
    the duplicate graph payload at `512.1ms`, completed bootstrap at `512.8ms`,
    first ran the real `22304` node / `74`-filter visible-graph derive at
    `696.6ms` for `183.8ms`, and rendered stats at `892.1ms` after the usable
    document started.
  - No `22304`-node visible-graph derive ran before bootstrap while the loading
    state was hiding the graph.
  - Imports toggle wall-clock latency was `202ms` median, `220ms` p95; in-webview
    latency was `53ms` median, `56ms` p95.
- Rejected early `APP_BOOTSTRAP_COMPLETE` experiments:
  - Moving bootstrap ahead of graph loading but still after cached timeline
    replay did not move the browser event stream. Graph data still arrived at
    `171.5ms`, bootstrap still arrived later at `1662.6ms`, and first stats
    rendered at `2135.4ms` after the usable document started. Imports toggle
    was `208ms` median, with one noisy Playwright p95 outlier; in-webview
    latency stayed `52ms` median.
  - Moving bootstrap ahead of cached timeline replay also did not move the
    browser event stream. Graph data arrived at `170.0ms`, bootstrap still
    arrived later at `1682.2ms`, and first stats rendered at `2140.1ms` after
    the usable document started. Imports toggle was `199ms` median, `206ms`
    p95; in-webview latency was `57ms` median, `60ms` p95.
  - Both production variants were reverted. The result suggests that the
    current first-display delay is not fixed by simply reordering
    `APP_BOOTSTRAP_COMPLETE` in the ready handler; the bridge/timeline replay
    path needs better delivery/phase instrumentation before changing startup
    semantics.
- After adding generic webview message-delivery tracing:
  - VS Code launch: `not captured` in the latest partial report.
  - Open Graph View to first rendered graph stats: `41989ms`.
  - Initial rendered stats: `2240` nodes, `5331` connections.
  - First-ready phases: command/open `1723ms`, acceptance-ready frame
    `40244ms`, stats wait after frame discovery `14ms`.
  - The browser received the first `GRAPH_DATA_UPDATED` at `108.7ms`, replayed
    cached/settings messages around `397ms`-`412ms`, received a duplicate
    `GRAPH_DATA_UPDATED` at `500.7ms`, skipped it at `510.2ms`, and only then
    received `APP_BOOTSTRAP_COMPLETE` at `510.9ms`.
  - The first real `22304` node / `74`-filter visible-graph derive started at
    `694.3ms`, took `183.3ms`, and first stats rendered after that.
  - Imports toggle wall-clock latency was `201ms` median, `214ms` p95; in-webview
    optimistic-to-rendered latency was `53ms` median, `59ms` p95.
- After adding extension-host outbound message tracing and coalescing dense
  graph index progress:
  - Before coalescing, the host sent `7844` `GRAPH_INDEX_PROGRESS` messages in
    one startup run. The same run hit the webview trace limit with repeated
    settings/control messages before graph data.
  - After coalescing progress to deterministic phase buckets, host
    `GRAPH_INDEX_PROGRESS` sends dropped to `51`.
  - A 5-sample interaction run preserved startup metrics but timed out during
    interaction sampling, so its startup evidence was kept as partial data:
    VS Code launch `1099ms`, first graph ready `46160ms`, and first-ready
    phases command/open `1673ms`, frame wait `44442ms`, stats wait `30ms`.
  - A shorter 2-sample interaction run completed: VS Code launch `796ms`,
    first graph ready `46329ms`, command/open `1680ms`, frame wait `44601ms`,
    stats wait `32ms`.
  - The completed run kept host `GRAPH_INDEX_PROGRESS` sends at `51`, with one
    inbound progress marker in the webview startup trace.
  - Imports toggle wall-clock latency was `357ms` median, `508ms` p95 across
    2 samples; in-webview optimistic-to-rendered latency stayed `55ms` median,
    `57ms` p95.

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
- The VS Code harness still reports a Playwright-driven wall-clock duration,
  but it now also reports the browser-side delta from
  `graphScope.edgeVisibility.optimistic` to `graphStats.rendered`. The current
  in-webview median is `55ms`, while the wall-clock median is `209ms`.
- Startup instrumentation shows first graph readiness is now dominated by
  command/view opening and waiting for the acceptance-ready webview frame. Once
  that frame is found, the stats label is already available within tens of
  milliseconds; the startup webview data stages are not the multi-second
  bottleneck.
- Lazy-loading the 3D runtime materially reduces the default Graph View bundle
  and keeps the 2D path from paying for Three.js up front. The current VS Code
  first-ready harness did not show a first-load win because its dominant bucket
  remains the view/frame readiness wait, not measured webview data work.
- Startup markers show that, after the webview document exists, ready/data/
  bootstrap/render work reaches first graph stats in roughly `341ms`. The
  multi-second first-ready wall clock is still outside measured webview graph
  derivation/rendering. Duplicate graph replay suppression removes avoidable
  post-startup work from the stale-cache refresh path, but it does not address
  the current frame-readiness bucket.
- Extension-host startup markers show the provider/webview resolver is not the
  first-load bottleneck: resolving, assigning the HTML shell, setting context,
  and flushing the pending refresh take only `2ms`-`3ms`.
- Combining filter glob patterns into one matcher addresses the next measured
  CodeGraphy-side startup cost for the user's filtered monorepo settings,
  cutting the `74`-filter visible-graph derive pass from `498.4ms` to `244ms`
  and moving first stats after webview document start from `843.3ms` to
  `586.4ms`.
- Command markers rule out the command palette/open command and provider
  resolver as the multi-second startup bucket. On the latest run, CodeGraphy
  assigned `webview.html` `45ms` after `codegraphy.open` started; the remaining
  outlier was after HTML assignment and before the harness could observe the
  VS Code webview frame/document. The performance harness now uses the same
  `120s` timeout as the rest of the graph-view metric collection for that
  frame wait so these outliers produce data instead of failed runs.
- Frame lifecycle markers show the coarse frame-readiness bucket is not just
  “no iframe exists.” VS Code attaches and navigates early webview frames
  around `1.8s`-`2.0s`, then the usable graph-ready fake.html frame appears
  much later around `37.0s`. The harness now writes a `startup-ready` metrics
  record before Graph Scope interaction sampling so a later control timeout
  still preserves startup evidence.
- The webview now skips duplicate graph payloads even while it is still waiting
  for `APP_BOOTSTRAP_COMPLETE`. This keeps loading semantics intact but avoids
  re-running visible-graph derivation when the same graph arrives before
  bootstrap settles.
- Directly focusing the Graph View tree item before the container fallback did
  not move the first-ready timing, so the command change was discarded instead
  of adding a behavior path without a measured win.
- Startup loading no longer derives or styles the real large graph before the
  app is allowed to display it. This removes hidden pre-bootstrap work, while
  the latest first-load wall clock remains dominated by VS Code webview frame
  readiness outside the measured CodeGraphy data path.
- Sending `APP_BOOTSTRAP_COMPLETE` earlier in the ready handler is not a
  sufficient startup-display fix. In real Extension Development Host runs, the
  browser still observed bootstrap after the graph replay/load messages, so the
  next startup iteration should instrument webview message delivery and cached
  timeline replay instead of committing a source reorder that does not change
  visible timing.
- Message-delivery tracing confirms the browser currently sees bootstrap only
  after graph data and the duplicate graph replay. The next startup hypothesis
  should follow the extension-host post sequence and cached timeline bridge,
  because the webview listener is receiving messages in that late order.
- Extension-host send tracing found a real message-volume bottleneck:
  uncoalesced graph index progress produced thousands of outbound messages on
  startup. Deterministic progress coalescing cuts that to dozens while keeping
  first/final and phase-boundary progress visible. The remaining repeated
  settings/control sends are now the next message-volume target.

Full test baseline:

- `pnpm run test`: `1523.98s` wall time
- Unit phase: `1009` test files and `6039` tests passed
- Playwright phase: `119` tests passed in `22.3m`

Raw logs are intentionally ignored under `reports/performance/`.
