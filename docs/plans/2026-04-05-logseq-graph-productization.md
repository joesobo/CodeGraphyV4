# Logseq Graph Productization

## Goal

Bring over the useful product ideas from Logseq without copying its whole stack. Start with one graph contract, a broader plugin API, semantic plugin relations, and a graph query layer backed by `graphology`. Keep renderer migration out of scope for now.

## Scope

- In:
  - one source of truth for graph types under `packages/plugin-api`
  - `graphology` spike for graph query/indexing
  - semantic plugin relations as real plugin-defined connections
  - plugin relations on by default when plugin installed
  - per-plugin / per-rule toggles in plugin popup
  - broader plugin slots: `toolbar`, `node-details`, `tooltip`, `timeline-panel`, `graph-overlay`
  - scoped plugin graph views
  - physics UX: pause/resume, charge range
  - docs + changesets for public API changes
- Out:
  - renderer migration to Pixi
  - focus-set behavior implementation
  - search slot
  - generic `settings` slot

## Decisions

- Canonical graph contract lives in `packages/plugin-api`
- Extension/shared graph types re-export canonical plugin-api types
- `semantic plugin relations` = plugin-defined edge kinds beyond imports, e.g. `calls`, `inherits`, `tests`, `scene-reference`
- Plugin relations appear in main graph by default
- Users can disable plugin relations via plugin popup and per-rule toggles
- `node-details` + `selection-panel` collapse into one inspector surface
- Semantic relations merge into the base graph cache
- Cache full graph data, then filter disabled plugin sources at runtime
- Fully convert edge meaning to explicit `kind`; do not keep `sourceId/sourceIds` as the meaning field
- Relation identity should include plugin provenance, e.g. `pluginId:kind:source->target[:variant]`
- `variant` stays optional as an escape hatch when `pluginId:kind:source->target` is not unique enough
- Merge same-direction same-kind edges between the same two nodes; keep multiple contributing sources on the merged edge
- `tooltip`, `node-details`, and `graph-overlay` stay open/flexible surfaces
- Plugins may contribute tooltip actions; host auto-loads them into the tooltip menu
- Tooltip actions are plugin-owned; host only provides registration and invocation plumbing
- Tooltip actions may open plugin-owned custom UI through supported host APIs
- This is a major plugin API change; built-in plugins should all be updated as example implementations
- Main graph and timeline should share the same filtered-graph selector over the same cached full graph
- Refactor overlapping graph filtering / toggle logic into shared code
- `graphology` should start as an extension-side graph cache/query service
- Plugins should be able to consume graph queries and register their own views / export options through the host API
- Expose host query APIs backed by `graphology`, not raw `graphology`
- Keep a small reserved core `kind` vocabulary, but allow plugin-defined namespaced kinds
- Revisit local-graph references after PR `#172` merges

## Subtasks

- `S1` unify graph contract; remove drift between public/runtime types; tests: contract coverage, typecheck
- `S2` spike `graphology` as internal graph index/query layer; tests: neighbors, incoming/outgoing, N hops, subgraph, edge-kind filters
- `S3` replace rule-shaped edge meaning with relation model: `kind` + provenance/toggle metadata; tests: edge build, toggle filtering, export coverage
- `S4` broaden plugin slots; first surfaces: `toolbar`, `node-details`, `tooltip`, `timeline-panel`, `graph-overlay`; add plugin tooltip actions; tests: host/webview registration + invocation coverage
- `S5` add scoped plugin views tied to active file / selection / plugin-defined scope; tests: view registration + transform coverage
- `S5a` add plugin export contributions; tests: registration + export invocation coverage
- `S5b` add host graph query API backed by `graphology`; tests: plugin query coverage without exposing internal graph engine
- `S6` add physics UX: pause/resume + charge range; tests: runtime wiring + settings coverage
- `S7` update all built-in plugins to the new API; tests: package test suites + example coverage
- `S8` update docs, examples, and major-version changesets for public API changes
- `S9` after PR `#172` merge, refresh local-graph references and align plan with merged seams before implementation starts

## API Direction

- Canonical graph model:
  - `IGraphNode`
  - `IGraphEdge`
  - `IGraphData`
  - explicit edge `kind` = what the edge means
  - merged edges keyed by direction + `kind`
  - provenance/toggle metadata separate from `kind`
  - merged edge keeps `sources[]` so UI can surface all contributing plugin relations
  - keep render-only/runtime-only fields separate from core data if needed
- Plugin additions:
  - relation provider API
  - graph query API
  - scoped view registration
  - export registration
  - slot registration
  - later: settings schema, but not as a slot

## Notes

- `graphology` is for internal graph modeling/querying, not renderer replacement
- Best first use of `graphology`: extension-side cache/query service built from canonical `IGraphData`
- Keep `react-force-graph` for now
- Local graph work is already underway in PR `#172`; do not fork that effort
- Public API changes need changesets in `plugin-api`, `extension`, and likely built-in plugins
- Runtime filtering should act on cached merged graph data rather than forcing full re-analysis on each toggle
- `kind` answers `what is this edge`; plugin/rule provenance answers `who emitted it` and `what toggle controls it`
- Shared selectors should feed both main graph and timeline
- Edge context menus / inspector should be able to show multiple sources on one merged edge
- Core kinds should be reserved and documented; plugin-defined kinds should be namespaced to avoid collisions

## Unresolved Questions

- Exact edge shape after the `kind` conversion:
  - `id`, `from`, `to`, `kind`, `sources[]`?
- Exact provenance/toggle shape:
  - one `source` object per contributing plugin rule?
  - fields like `pluginId`, `sourceId`, `label`, `enabledByDefault`?
- Where should the `graphology` index live first:
  - analyzer-side cache
  - shared graph service
  - webview-side query helper
- Exact core `kind` vocabulary for v1:
  - `import`, `reexport`, `call`, `inherit`, `reference`, `test`, `load`?
- Exact custom-kind rule:
  - free-form string?
  - plugin-namespaced string like `pluginId:kind`?
- Exact `sources[].metadata` policy:
  - scalar JSON only?
  - size limit?
  - host-display only, not behavior?
- Tooltip action contract:
  - required fields
  - sync vs async
  - whether actions may mutate graph state, open files, trigger commands, or launch custom UI
