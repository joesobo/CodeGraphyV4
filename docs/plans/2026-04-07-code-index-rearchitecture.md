# Code Index Rearchitecture

## Goal

Replace CodeGraphy's current parser-orchestrator core with a persistent symbol-aware code index that still projects into the existing `file | folder | package` graph, existing views, and existing force/physics renderer.

## Scope

- In:
  - Tree-sitter as a core built-in analysis layer, not a plugin
  - breaking plugin API revision aligned around index enrichment instead of raw file-edge detection
  - persistent repo-local index in `.codegraphy/`
  - LadybugDB-backed storage for graph + vector data
  - symbol extraction + symbol-to-symbol relations + file-level projection
  - incremental re-indexing on file changes
  - timeline compatibility through projected file-graph snapshots
  - agent/query access to the local index
  - symbol export generated from indexed graph data
  - updated connection export aligned with the new edge/index model
  - popup reorganization for node/edge visibility and styling
  - unified graph surface replacing the current split view model
  - docs/readme cleanup for the breaking change
- Out:
  - renderer replacement
  - raw DB export
  - keeping the current split `connections` / `folder` / `depth` model
  - symbol-only UX as the default graph
  - keeping the current plugin API stable
  - wiki generation

## Decisions

- Tree-sitter lives in core.
- No new internal package for indexing. Core indexing work stays inside `packages/extension`, with `packages/plugin-api` exposing the extension surface and plugin packages consuming that API.
- Architecture direction stays `core <- plugin-api <- plugin`.
- Plugins communicate with the core only through `plugin-api`, never by reaching into core internals directly.
- Current plugins get refactored around the new index model.
- This is a breaking API change. Update built-ins as part of the rewrite.
- Main graph stays file/folder/package oriented.
- Core node types start as `file | folder | package` but node types must be extensible so plugins can add more.
- Collapse `connections`, `folder`, and `depth` into one unified graph surface.
- Node visibility is controlled from the `Nodes` popup.
- Edge visibility/styling is controlled from the `Edges` popup.
- `depth` behavior becomes a graph filter/focus mode on the unified graph, not its own separate view.
- Symbols are primarily for indexing, resolution, querying, exports, timeline overlays, and optional visualizations.
- Drop the optional symbol visualization surface from scope.
- `.codegraphy/` is the canonical local cache/index location.
- CodeGraphy should auto-add `.codegraphy/` to repo `.gitignore` when safe.
- Move all meaningful repo-specific CodeGraphy settings out of `.vscode/settings.json` and into `.codegraphy/settings.json`.
- LadybugDB is the default persistence layer unless blocked by integration constraints discovered during implementation.
- Use native Tree-sitter in the extension host for this rewrite; do not add WASM Tree-sitter to CodeGraphy core right now.
- Opening the graph before indexing should show discovered nodes without connections.
- Repo indexing is user-triggered from the graph UI via an `Index Repo` button with a bottom loading bar.
- After initial indexing completes, `Index Repo` becomes `Refresh`, which forces a full re-index on purpose.
- File changes should trigger targeted reprocessing of affected files and dependent index records, not full re-index.
- Tree-sitter supplies the base analysis; plugins run after and may overwrite, add, modify, or remove indexed data.
- Core reads each file once during indexing.
- Core processes supported files with Tree-sitter first.
- Plugins then process the same in-memory file data after core processing.
- Final per-file output is produced by merging core output first, then plugin output on top with plugin priority on conflicts.
- Live on-save incremental updates should run only while CodeGraphy is active/open.
- If CodeGraphy is closed while files change, changes should batch up and be applied the next time CodeGraphy opens.
- Timeline should consume projected file-edge snapshots derived from the index, not symbol-graph rendering by default.
- Timeline full refresh should replay from the first indexed commit forward, carrying the previous DB state into each next commit. No periodic checkpoints.
- Graph toggles should support relation-kind controls, while provenance/source metadata remains inspectable and exportable on edges.
- `package` means real workspace/package boundaries such as monorepo packages or equivalent project units.
- Built-in plugins should be aggressively simplified once the new Tree-sitter core covers their current baseline work.
- Plugin output should override core output directly, like replacing object fields, not coexist as parallel conflicting results.
- Create `.gitignore` automatically when absent, then add `.codegraphy/`.
- Loading UI can stay simple: one percent-based progress bar at the bottom of the graph.
- Reorganize graph controls:
  - keep the `Plugins` popup, but repurpose it for plugin enable/disable and drag reordering
  - move groups out of the main settings popup into a dedicated `Legends` popup
  - add a `Nodes` popup for node-type toggles
  - add an `Edges` popup for edge-type toggles and edge-type color controls
- Edge types should support user-facing color assignment similar to current group color controls.
- On first open before indexing:
  - only `file` nodes are visible by default
  - `folder`, `package`, and other node types default off
- `NESTS` edges default on the first time, but only become visible when the required node types such as `folder` are enabled.
- Toggling an edge kind whose required node types are hidden should have no visible effect until those node types are shown.
- Node/edge visibility and color settings persist in `.codegraphy/settings.json`.
- Core-defined edge types get a default palette from the extension.
- Plugin-defined edge types must declare a default edge color.
- Users can override any edge color through settings/UI.
- Structural folder/package edges use `NESTS` for now.
- Plugin-added node types default on.
- Plugin-added edge types default on.
- `Legends` settings replace the old `groups` settings and persist in `.codegraphy/settings.json`.
- Use one LadybugDB database per repo.
- Symbol IDs use `file + symbol name + kind + optional signature`.
- Plugin migration is a hard cutover.
- Flow/data-flow view is deferred until after the core rewrite lands.
- File-to-file edges are projected from any symbol relation crossing files.
- Same-kind edges between the same two rendered nodes merge into one rendered edge.
- Different edge kinds between the same two rendered nodes render as separate edges.
- Plugin-added node types participate in the same graph by default and can be toggled in `Nodes`.
- Node and edge colors can come from defaults, plugins, or legend rules.
- `Legends` owns color editing and priority ordering for regex/group rules.
- Legend priority is bottom-to-top: bottom applies first, top applies last and can override lower rules.
- This refactor needs a clean docs pass, updated changesets, and a README section describing the core programming stack.
- `.codegraphy/settings.json` should be mostly internal but still human-editable.
- CodeGraphy should watch `.codegraphy/settings.json` for manual edits and refresh relevant UI/index state when it changes.
- `.codegraphy/meta.json` currently tracks:
  - `version`
  - `lastIndexedAt`
  - `lastIndexedCommit`
  - `pluginSignature`
  - `settingsSignature`
  - `pendingChangedFiles`
- Built-in plugins should still appear in the `Plugins` popup and follow the same ordering rules as external plugins.
- Plugin processing order is bottom-to-top in the `Plugins` popup.
- Top plugin wins on merge conflicts.
- The shared per-file analysis result now consists of:
  - contributed node types
  - contributed edge types
  - analysis nodes
  - symbols
  - relations

## Product Shape

- Keep:
  - package layout centered on `extension` + `plugin-api` + plugin packages
  - current graph renderer
  - current force physics
  - current plugin extensibility concept
- Replace:
  - current "plugins detect file connections directly" pipeline
  - current cache model as the primary source of truth
  - current split graph view model with one unified graph surface
- Add:
  - persistent code index
  - symbol-aware resolution
  - query/agent surface over the index
  - symbol export from the index
  - updated connection export from projected graph/index data

## Target Architecture

- `discovery`
  - walk workspace
  - register file / folder nodes
  - register package nodes when detectable from real workspace/package boundaries
- `parse`
  - core Tree-sitter parses supported languages
  - plugins may add unsupported languages or richer project-aware parsing
- `extract`
  - symbols
  - imports
  - references
  - calls
  - inheritance / implementation
  - language-specific edges
- `resolve`
  - connect references to files and, when possible, concrete symbols
  - attach provenance
- `index`
  - maintain fast in-memory lookup structures during indexing before persistence
  - examples: symbol table, file/path suffix index, node-type registry
  - avoid repeated disk reads by sharing one in-memory file payload across core + plugin processing
- `persist`
  - write entities + relations into LadybugDB under `.codegraphy/`
- `project`
  - derive file-level graph edges from symbol/file/package relations
  - derive toggle metadata for source kinds
  - derive exportable symbol and connection payloads
  - derive unified graph payloads filtered by node/edge settings
- `render`
  - existing graph/webview consumes projected graph data
- `query`
  - CodeGraphy APIs, timeline, exports, and agents query the persisted index

## Data Model

- Nodes:
  - `File`
  - `Folder`
  - `Package`
  - `Symbol`
  - plugin-extensible node kinds
- Relations:
  - `NESTS`
  - `IMPORTS`
  - `CALLS`
  - `REFERENCES`
  - `INHERITS`
  - `IMPLEMENTS`
  - `LOADS`
  - `TESTS`
  - `DECLARES`
  - `MEMBER_OF`
- Projection outputs:
  - unified graph payloads for rendering
  - merged file edges for current graph views
  - timeline snapshots
  - symbol export inputs
  - updated connection export inputs
  - query/impact/flow inputs

## Core vs Plugin Responsibility

- Core owns:
  - discovery
  - Tree-sitter parsing for supported languages
  - base symbol schema
  - persistence
  - graph projection
  - incremental invalidation
  - query surface
- Plugins own:
  - unsupported languages
  - richer language semantics
  - project/framework/config-aware resolution
  - extra relation kinds
  - symbol enrichment
  - overlays / optional views
  - post-core correction of extracted data when base Tree-sitter output is insufficient
  - additional UI surfaces such as views, popups, and presets

## Plugin API Direction

- Remove raw `detectConnections(filePath, content, workspaceRoot)` as the central contract.
- Replace with index-oriented hooks such as:
  - `supportsLanguage(...)`
  - `contributeNodeTypes(...)`
  - `contributeEdgeTypes(...)`
  - `extractSymbols(...)`
  - `extractRelations(...)`
  - `resolveRelations(...)`
  - `enrichFiles(...)`
  - `enrichSymbols(...)`
  - `projectRelations(...)`
- Plugin execution model:
  - core output is the base object
  - plugin output is merged afterward
  - later plugins win on conflicts
  - plugins are not limited to node/edge types; they may also contribute supported UI extension points
- Preserve host APIs for:
  - decorations
  - commands
  - exporters
  - graph queries
- Revisit the public `view` API because the host no longer centers separate built-in graph views the same way.
- Keep provenance first-class so relation families can be toggled on/off to reduce noise.

## Unified Graph Behavior

- Start from discovered `file | folder | package` nodes.
- Analyze each file into symbols + candidate relations.
- Persist symbol graph.
- Project symbol/file relations into merged graph edges for rendering.
- Keep per-kind / per-source toggles so large graphs stay usable.
- Refresh graph from projected data when the index changes.
- Before indexing, render discovered nodes with no connections.
- Orphan nodes are normal and expected even after indexing.
- After indexing, replace the bottom `Index Repo` action with `Refresh`.
- Before indexing:
  - only file nodes are shown by default
  - folder/package nodes can be enabled from `Nodes`
  - depth/focus behavior stays unavailable because it depends on connections
- The graph surface should support:
  - file-only rendering
  - folder-only rendering
  - mixed file+folder rendering
  - package rendering where available
  - plugin-added node rendering where available
  - focused/depth-filtered rendering over the same underlying graph
- If two rendered nodes have multiple projected edges:
  - same edge kind merges into one rendered edge
  - different edge kinds remain separate rendered edges
- `NESTS` is just another edge kind from the UI perspective, even though it is derived structurally rather than semantically.
- Depth behavior should work as a toolbar toggle:
  - toggling depth mode on reveals a depth slider
  - clicking a node while depth mode is on activates the old depth behavior
  - toggling depth mode off returns the graph to normal unfocused behavior

## Timeline Behavior

- Re-indexing symbols does add work, but timeline should stay viable if snapshots are projected and cached at file-graph level.
- Do not resolve timeline by rendering the full symbol graph.
- Use symbol index for better commit diffs:
  - changed symbols
  - added/removed edges
  - stronger relation accuracy
- Cache projected commit graph outputs separately from the live symbol store when needed for playback speed.
- Timeline rebuild strategy:
  - analyze first commit fully
  - carry DB state forward commit by commit
  - analyze only each commit's diff against the carried-forward state
  - rely on cached history until the user intentionally requests a full refresh

## Storage

- Repo-local path: `.codegraphy/`
- Contents:
  - `settings.json` for all repo-specific CodeGraphy settings
  - LadybugDB database
  - `meta.json` for index metadata
  - optional embeddings/vector data
- Git hygiene:
  - auto-add `.codegraphy/` to `.gitignore` when absent
  - never index `.codegraphy/` itself
- Do not depend on `.vscode/settings.json` for repo-specific CodeGraphy behavior.

## Export Direction

- Remove wiki generation from the current refactor scope.
- Add symbol export generated from indexed graph data.
- Update connection export so it reflects projected edge kinds, provenance, and any new edge metadata.
- Export shape should stay easy for both humans and agents to parse.
- Connection export should keep the same job as today, but shift terminology/shape toward:
  - `legend` instead of `groups`
  - explicit `nodes`
  - explicit `edges`
  - updated edge metadata instead of old rule/connection language where needed

## New Surfaces Worth Adding

- query/agent integration
  - local tools can ask for context, impact, flow, hotspots, and relation summaries
- graph control popups
  - `Legends` for groups/colors
  - `Nodes` for node-type toggles
  - `Edges` for edge-type toggles and edge colors
  - `Plugins` for plugin enable/disable and drag reordering

## GitNexus Ideas To Borrow

- repo-local indexed state
- Tree-sitter-first parsing
- precomputed symbol/process intelligence
- agent/query-first access to the graph
- hybrid graph + vector persistence
- use of temporary in-memory lookup indexes during one indexing run before persistence

## GitNexus Ideas Not To Copy Blindly

- replacing the current CodeGraphy renderer/UI model
- making symbol-level graph the default primary experience
- optimizing first for MCP/agents instead of the VS Code graph experience

## Workstreams

- `S1` design canonical index schema for files, folders, packages, symbols, and relations
- `S2` choose and validate Tree-sitter integration approach inside core
- `S3` spike LadybugDB integration under `.codegraphy/`
- `S3a` add `.codegraphy/settings.json` + watcher/read-write flow
- `S4` redesign plugin API around extraction / enrichment / resolution
- `S4a` design plugin-extensible node and edge registries
- `S5` build projection layer from symbol graph to current `IGraphData`
- `S5a` collapse built-in graph views into one unified graph surface with node/edge-driven filtering
- `S5b` implement merged-edge rendering rules for same-kind vs different-kind edges
- `S6` migrate built-in analyzers to the new core + plugin model
- `S7` wire file-watch incremental updates into the index
- `S8` adapt timeline to consume projected indexed snapshots
- `S9` add query surface for impact/context/flow
- `S10` add symbol export and update connection export from the index
- `S10a` reorganize graph control popups into `Legends`, `Nodes`, `Edges`, and `Plugins`
- `S10b` add edge-type coloring controls
- `S10c` move regex/group coloring control into `Legends` with ordered override rules
- `S11` update docs, examples, changesets, and migration notes
- `S11a` add README section describing the core programming stack

## Expected Outcomes

- Opening CodeGraphy on a supported repo produces the graph from the persisted `.codegraphy/` index instead of rebuilding everything from scratch.
- The default experience works on more languages with no extra plugin install when Tree-sitter coverage exists.
- The main graph still renders `file | folder | package` nodes and feels the same or better to use through one unified graph surface.
- Graph edges are more accurate because they can be backed by symbol-aware resolution instead of only file-level heuristics.
- Connection kinds remain toggleable so large graphs stay navigable.
- Editing one file updates only the relevant index records and projected graph edges.
- Timeline still works, but its snapshots are derived from incremental indexed changes instead of raw per-file connection rescans.
- Plugins still extend CodeGraphy, but now by enriching the index/resolution pipeline rather than replacing the whole parser path.
- The persisted index can be queried for impact/context/export/agent scenarios.
- Symbol export and connection export can be generated from the cached graph without rescanning the repo.

## Manual Validation

- [ ] `MV1` fresh repo open:
  Open a supported repo with no `.codegraphy/`.
  Expected: CodeGraphy shows only disconnected file nodes by default and offers `Index Repo`.
- [ ] `MV2` warm reopen:
  Close and reopen VS Code on the same repo.
  Expected: if an index exists, graph loads projected data from `.codegraphy/` materially faster than first indexing and does not full-rescan unchanged files.
- [ ] `MV2a` initial manual index:
  Click `Index Repo`.
  Expected: bottom loading bar appears, `.codegraphy/` is created with `settings.json`, `.gitignore` is updated when safe, and graph refreshes with connections when indexing completes.
- [ ] `MV2b` manual full refresh:
  Click `Refresh` after the repo is already indexed.
  Expected: CodeGraphy performs a full re-index on purpose and refreshes the graph when complete.
- [ ] `MV3` built-in Tree-sitter coverage:
  Open a repo in a Tree-sitter-supported language without installing a language plugin.
  Expected: useful file connections appear in the graph.
- [ ] `MV4` plugin enrichment:
  Install or enable a richer plugin for a supported language.
  Expected: plugin output can overwrite/add/modify/remove the base Tree-sitter result without a broken duplicate pipeline.
- [ ] `MV5` unsupported language fallback:
  Open a repo where Tree-sitter coverage is missing or weak but a plugin exists.
  Expected: plugin fills the gap and graph still works.
- [ ] `MV6` incremental update:
  Edit a file to add/remove an import, call, or reference.
  Expected: while CodeGraphy is open, save triggers only affected index/graph updates and graph refreshes without full rebuild.
- [ ] `MV6a` deferred incremental update:
  Make many file changes while CodeGraphy is closed, then open it.
  Expected: pending changes batch-process with the bottom loading bar before graph data catches up.
- [ ] `MV7` toggle noise control:
  Turn specific relation kinds or plugin-provided sources on/off.
  Expected: graph updates instantly from cached/projected data.
- [ ] `MV7a` pre-index view availability:
  Open CodeGraphy before indexing.
  Expected: folder/package node types can be enabled from `Nodes`; depth/focus behavior is unavailable or disabled until connections exist.
- [ ] `MV8` timeline indexing:
  Index repo history on a medium repo.
  Expected: first commit is expensive, later commits reuse carried-forward DB state and primarily process diffs/incremental changes.
- [ ] `MV9` timeline playback:
  Scrub and play timeline after indexing.
  Expected: playback remains smooth because projected file-graph snapshots are cached.
- [ ] `MV10` agent/query usefulness:
  Run a local query for symbol/file impact or context.
  Expected: index answers questions without rescanning the whole repo.
- [ ] `MV11` symbol export:
  Export symbols from a warmed index.
  Expected: output is generated from indexed graph data and includes stable symbol/file relation data.
- [ ] `MV11a` connection export:
  Export connections from a warmed index.
  Expected: output reflects projected edge kinds, toggles, and added metadata from the new model.
- [ ] `MV11b` graph control reorg:
  Open graph controls after the refactor.
  Expected: `Legends`, `Nodes`, `Edges`, and `Plugins` popups exist; groups are no longer in main settings.
- [ ] `MV11b1` plugin popup:
  Open the plugins popup after the refactor.
  Expected: built-in and external plugins can be enabled/disabled and drag-reordered; processing order is bottom-to-top.
- [ ] `MV11c` edge colors:
  Assign colors to edge types in the `Edges` popup.
  Expected: graph edges recolor by edge kind without affecting node/group colors.
- [ ] `MV11c1` legend priority:
  Reorder legend rules and verify overlapping regex matches.
  Expected: bottom rules apply first, top rules override them last.
- [ ] `MV11d` unified graph surface:
  Toggle file/folder/package nodes and multiple edge kinds on/off from the same graph surface.
  Expected: the old separate `connections` / `folder` / `depth` split is replaced by one graph surface that reconfigures live from node/edge settings.
- [ ] `MV11d1` merged edge rendering:
  Create two rendered nodes with multiple projected relations between them.
  Expected: same-kind relations merge into one rendered edge; different kinds render as separate edges.
- [ ] `MV11e` structural-edge default interaction:
  Open the graph with default settings, then enable `folder` nodes.
  Expected: structural edges appear immediately because that edge kind is already enabled by default.
- [x] `MV11f` depth mode:
  Toggle depth mode on from the toolbar, adjust the depth slider, and click a node.
  Expected: graph enters the old depth-focused behavior; toggling depth mode off restores the normal graph.
- [x] `MV11g` settings file watch:
  Edit `.codegraphy/settings.json` by hand.
  Expected: CodeGraphy detects the change and refreshes the relevant graph/UI state.
- [ ] `MV12` graph UX parity:
  Use the unified graph in the scenarios previously covered by `connections`, `folder`, and `depth`.
  Expected: no regression in graph rendering, navigation, filters, or physics controls.

## Risks

- Tree-sitter alone will not resolve enough semantics for some languages; plugin enrichment is mandatory, not optional.
- Full symbol indexing can slow timeline builds if commit snapshots try to recompute full semantic resolution each time.
- LadybugDB integration may force schema/query design constraints that should be understood early.
- Breaking the plugin API means built-ins and external examples must move together.
- Incremental invalidation gets harder once relations become symbol-aware across files.

## Notes

- The rewrite changes how data is produced and how graph toggles/settings are organized, not the core renderer/physics model.
- File nodes remain the visual anchor for the main experience.
- Symbols should strengthen graph meaning, not overwhelm the default UI.
- Timeline performance depends on caching projected outputs aggressively.
- Query/agent support becomes much stronger once the persisted index exists.
- Node/edge controls become the primary way users shape the graph, instead of switching between multiple built-in view modes.

## Unresolved Questions

- Exact graph projection rules from symbol relations to merged file edges beyond the current same-kind/different-kind merge rule
