# Rust Core And WebGPU Architecture Brainstorm

## Status

Exploratory brainstorm, not an implementation plan.

The goal is to imagine CodeGraphy as a program you install first, with VS Code,
MCP, and other surfaces acting as clients of the same local core.

## Rust Crates And Installation Shape

Rust crates are roughly equivalent to packages. A Rust project can have several
crates internally while still shipping one installed program.

The desired product shape is still one user-facing core install:

```text
codegraphy
```

Internally, that single installed binary can be built from multiple crates:

```text
codegraphy-core      internal Rust library crate
codegraphy-protocol  internal request/response type crate
codegraphy-cli       binary crate that produces the `codegraphy` executable
```

Users should not need to think about those crates. They install and run
`codegraphy`.

## Chosen Direction So Far

Use the main Rust CLI binary as both the human CLI and the machine interface.

```text
Human CLI:
  codegraphy index
  codegraphy query
  codegraphy status
  codegraphy plugin install

Machine mode:
  codegraphy stdio
```

`codegraphy stdio` is not a daemon and not a network server. It is a long-lived
child process started by a client, such as the VS Code extension. The client
sends JSON or JSON-RPC-style messages over stdin and receives responses over
stdout.

This keeps one core program while avoiding a fresh process spawn for every UI
interaction.

## High-Level Architecture

```text
                         one installed program
                         `codegraphy`
                                |
                                v
                    Rust CodeGraphy core engine
                    - indexing
                    - SQLite cache
                    - graph query
                    - search/filter/sort/projection
                    - plugin registry/runtime
                    - plugin extension contributions
                    - graph diffs

       +------------------------+------------------------+
       |                        |                        |
       v                        v                        v
  Human CLI              Machine stdio mode          MCP binary/adapter
  `codegraphy query`     `codegraphy stdio`          agent tools
                            ^
                            |
                    VS Code extension
                     TypeScript shell
                     - VS Code API
                     - settings UI
                     - graph controls
                     - plugin UI host
                     - webview wiring
                            |
                            v
                     Webview graph UI
                     - WebGPU 2D renderer
                     - interactions
                     - panels/menus
```

The Rust core is the source of truth. The VS Code extension provides UI for core
features rather than reimplementing core behavior in TypeScript.

## VS Code Process Model

When a VS Code window opens:

```text
VS Code window
  -> TypeScript extension activates
  -> extension starts `codegraphy stdio`
  -> extension sends requests over stdin/stdout
  -> Rust core reads/writes SQLite and computes graph/query results
  -> extension/webview renders the returned projection or diff
```

If multiple VS Code windows are open, the simplest model is one `codegraphy
stdio` process per window:

```text
Window A -> codegraphy stdio process A
Window B -> codegraphy stdio process B
              |
              v
       same workspace SQLite cache
```

This is acceptable if the processes are lightweight and SQLite write
coordination is handled correctly. Architecturally there is still one core: one
Rust codebase and one local cache format. There may simply be multiple running
instances, just like multiple terminals can run the same CLI.

## SQLite Multi-Process Coordination

"SQLite write coordination is handled correctly" is doing a lot of work in the
multi-window model and needs a concrete design:

- Open the cache in WAL mode with a generous `busy_timeout`. WAL allows many
  readers concurrent with one writer, which matches the desired shape.
- Elect a single indexer per workspace. If Window A and Window B both start
  `codegraphy stdio` against the same workspace, only one process should run
  the watcher/indexer; the other should be a reader. A simple election is an
  advisory lock (a locked row or a separate lock file with the writer's PID and
  a heartbeat timestamp). When the writer exits, a reader promotes itself.
- Readers need a change signal. A monotonically increasing `revision` value in
  a metadata table plus either polling on a slow timer or a filesystem watch on
  the WAL file is enough for readers to know "re-run my active projection and
  send a diff."
- Migrations must be guarded by the same writer election so two processes never
  race a schema upgrade.

This also answers "are per-window processes wasteful": readers are cheap; only
the elected writer pays for watching and indexing.

## File Watching Ownership

`watchWorkspace` appears in the protocol list but the watcher's owner is
undecided, and it matters:

- If the Rust core owns watching (e.g. the `notify` crate), the CLI and MCP
  surfaces get incremental indexing for free, but each core process needs the
  writer election above to avoid N watchers per workspace.
- If the VS Code extension forwards its own file events into the core, the
  extension inherits VS Code's efficient platform watcher and remote support,
  but then CLI/MCP long-lived sessions need their own watch path anyway.

Recommendation: the core owns watching (single code path for all surfaces),
gated behind the writer election, with debounced incremental re-index. The
extension may additionally forward save events for lower latency on the file
the user is editing.

## Where The Binary Runs: Remote, Containers, Web

This is the biggest gap in the current draft. VS Code is not always one local
process:

- Remote SSH / WSL / dev containers: the extension host runs on the remote
  machine, next to the workspace files. `codegraphy stdio` must run there too,
  which means the extension needs the right binary for the *remote* platform,
  not the user's laptop. The webview (and therefore the WebGPU renderer) runs
  on the local client — this split is actually favorable: indexing happens
  where the files are, rendering happens where the GPU is. The graph payload
  crosses the remote channel, which strengthens the case for compact binary
  projections and diffs.
- vscode.dev / github.dev (VS Code in a browser): there is no process spawn at
  all, so a native binary cannot run. Decision: browser-hosted VS Code is
  unsupported. The extension should detect the web environment and show a
  clear "CodeGraphy requires desktop VS Code" message rather than failing
  silently. (Remote SSH/WSL/containers remain supported — those have a real
  machine to run the binary on.)
- Platform matrix: macOS arm64/x64, Windows x64/arm64, Linux gnu/musl
  x64/arm64. Biome and esbuild both ship platform-specific packages;
  platform-specific VSIXes are the VS Code equivalent.

## Binary Distribution And Version Skew

- Prefer bundling the binary in platform-specific VSIXes (the repo already
  builds platform VSIXes for Tree-sitter natives, so this pipeline exists),
  with a `codegraphy.path` setting to override with a user-installed binary,
  Deno/Biome style.
- The `initialize` handshake must exchange protocol versions and refuse or
  degrade cleanly on mismatch. Version skew is guaranteed once the CLI can be
  installed independently of the extension.
- Windows file locking of a running binary during extension update needs the
  Biome-style copy-to-temp workaround.

## Protocol Details Worth Deciding Early

- Do not invent framing. JSON-RPC 2.0 with LSP-style `Content-Length` framing
  gets mature client/server libraries on both sides, plus a well-understood
  model for requests, notifications, cancellation (`$/cancelRequest`), and
  progress (`$/progress`). Indexing is long-running; cancellation and progress
  are day-one requirements, not extensions.
- JSON is fine for control messages but wrong for graph payloads: typed arrays
  become base64 or number arrays, and the cost is paid again at every hop.
  Reserve a binary frame type (length-prefixed, referenced from a JSON-RPC
  result by id) for projections and diffs.
- Define revision semantics for diffs: every projection and diff carries the
  revision it was computed from; a client that misses a diff or reconnects
  requests a full snapshot. Snapshot + ordered diff log is the model.

## One Flat Binary Path End To End

The single biggest cross-cutting performance idea, and the reason the Rust
core and the WebGPU renderer belong in the same conversation:

```text
Rust core builds struct-of-arrays projection
  (positions?, node ids, sizes, colors as flat typed buffers)
  -> binary frame over stdio (no JSON, no base64)
  -> extension holds it as a Uint8Array, does not parse it
  -> webview.postMessage(msg, [buffer]) transfers the ArrayBuffer
  -> webview writes it straight into GPU buffers (queue.writeBuffer)
```

VS Code added ArrayBuffer transfer to webview messaging precisely because
JSON-serializing typed arrays was pathologically slow
([issue #115807](https://github.com/microsoft/vscode/issues/115807),
[PR #148429](https://github.com/microsoft/vscode/pull/148429) extended it to
webview views). Do not count on `SharedArrayBuffer` in webviews — it requires
cross-origin isolation headers the webview host does not guarantee.

The payoff: node and edge data is encoded once in Rust and decoded zero times.
The extension host is a dumb pipe. If any hop reintroduces per-node JS objects,
most of the Rust rewrite's rendering benefit is lost. This constraint should
shape the projection format before either the core or the renderer is built.

## Plugin Migration Cost

The draft describes the plugin end state but not what happens to the seven
existing TS plugins (typescript, vue, svelte, godot, unity, markdown,
particles). Looking at their actual shape:

- They are imperative TS with hooks (`analyzeFile`, `onPreAnalyze`,
  `onFilesChanged`) and real logic — e.g. the TypeScript plugin implements
  tsconfig path-alias resolution. A purely declarative "tree-sitter queries +
  mapping manifest" format would cover the simple analyzers but not these.
- Realistic options per plugin: (a) fold into the Rust core as built-in
  analyzers (likely right for typescript/markdown — they are near-core), (b)
  rewrite as Wasm plugins, (c) run under a JS compatibility host (Oxc-style),
  (d) stay webview-only (particles needs no core at all).
- Whatever the path, build a differential harness first: run the Rust indexer
  and the current TS indexer over fixture repos and diff emitted facts. That
  harness is also the rewrite's acceptance test.

## Wasm Runtime Specifics

- Runtime: Wasmtime with the component model and WIT-defined interfaces is the
  current best practice for typed plugin ABIs (this is where the ecosystem
  SWC/Zed pointed at is converging).
- Resource limits: use epoch interruption or fuel so a misbehaving plugin
  cannot hang indexing — this is the rust-analyzer proc-macro lesson applied
  to Wasm.
- Parse once: plugins must not each bundle their own Tree-sitter and re-parse
  files. The host should parse once and expose an AST/query API through the
  plugin interface. This is both a performance and a plugin-size decision, and
  it constrains the WIT interface early.

## Migration Sequencing

The end state is well described but there is no strangler path. A workable
order, each step shippable:

```text
1. Renderer seam in the webview (GraphRenderer interface, react-force-graph
   behind it). Pure TS, no Rust dependency, immediately useful.
2. WebGPU 2D renderer behind the seam, CPU layout. Biggest visible win,
   independent of the core rewrite.
3. Rust indexer as a sidecar: `codegraphy stdio` produces graph facts, the
   existing extension consumes them behind the current data layer, validated
   by the differential harness.
4. Move query/search/filter/projection into the core; extension data layer
   shrinks to a protocol client.
5. Plugin runtime (Wasm host), migrate plugins per the table above.
6. CLI/MCP surfaces over the now-proven core.
```

Steps 1–2 and 3–4 are independent tracks and can proceed in parallel.

## Why Not A Server

This direction intentionally avoids an always-on CodeGraphy server.

- No port.
- No global daemon.
- No separate background service.
- No user-visible server lifecycle.

`codegraphy stdio` lives only while the client that started it needs it. It is a
local process mode of the main binary.

## Core Responsibilities

The Rust core should own durable and computational behavior:

- workspace indexing;
- Tree-sitter parsing and language analysis;
- plugin loading and execution;
- plugin manifests, registry, install, enablement, and capability discovery;
- SQLite cache reads/writes/migrations;
- graph query;
- search;
- filtering;
- sorting;
- visible graph projection;
- graph diff generation;
- node/edge detail lookup;
- plugin installation and registry state;
- plugin command dispatch for core-owned plugin behavior.

The important idea is that CLI, MCP, and VS Code all use the same query and data
processing engine.

## VS Code Extension Responsibilities

The TypeScript extension should stay at the VS Code seam:

- activation;
- VS Code commands;
- settings UI;
- webview lifecycle;
- translating UI events into core requests;
- forwarding core results to the webview;
- editor/file opening behavior;
- host-specific affordances;
- hosting plugin-provided extension/webview contributions.

The extension should not own indexing, durable graph facts, graph query
semantics, or heavy data processing.

The extension can still be extended by plugins. The distinction is that the
extension hosts plugin UI contributions while the Rust core owns plugin identity,
installation, enablement, data, and core behavior.

## Protocol Shape

The machine interface can be a small typed protocol over stdio.

Example request:

```json
{ "id": 1, "method": "queryGraph", "params": { "search": "auth", "edges": ["import"] } }
```

Example response:

```json
{ "id": 1, "result": { "nodes": [], "edges": [], "revision": 42 } }
```

Likely methods:

```text
initializeWorkspace
getStatus
indexWorkspace
watchWorkspace
queryGraph
getVisibleGraph
getGraphDiff
searchNodes
getNodeDetails
listPlugins
installPlugin
listPluginContributions
invokePluginCommand
shutdown
```

The protocol should be versioned and diff-oriented so the extension does not
constantly move huge JSON graphs across the process boundary.

## SQLite Cache

The Rust rewrite does not need to keep LadybugDB. SQLite is a good default for
the Rust core because it is local, durable, inspectable, portable, and good at
querying indexed facts.

Possible cache shape:

```text
.codegraphy/
  cache.sqlite
```

SQLite can store:

- files;
- symbols;
- relationships;
- plugin facts;
- revisions;
- settings relevant to indexed data;
- migration state.

The extension can keep visual state such as pan, zoom, selection, and temporary
view state outside the durable graph cache unless there is a reason to persist
it.

## Plugin Direction

Plugins are a key part of the architecture. They should extend both the Rust
core and the VS Code/webview experience without becoming separate VS Code
extensions by default.

The plugin should have one identity:

```text
codegraphy.godot
codegraphy.unity
acme.architecture-tools
```

That one plugin identity can declare multiple contribution surfaces:

```text
Core contributions
  - language analyzers
  - graph enrichers
  - query extensions
  - exporters
  - plugin commands
  - plugin-owned SQLite facts/data

Extension/webview contributions
  - Graph View toolbar actions
  - context menu entries
  - settings panels
  - graph side panels
  - viewport overlays
  - custom node/edge display metadata
  - optional webview assets
```

The core installs and enables the plugin. The extension asks the core what UI
contributions are active for the current workspace.

```text
codegraphy plugin install acme.graph-tools
        |
        v
Rust core registry
        |
        +--> core loads plugin analyzer/query/export behavior
        |
        +--> VS Code extension receives plugin UI contribution descriptors
                  |
                  v
              webview renders plugin UI slots/overlays/actions
```

### Plugin Package Shape

A future plugin package could look like this:

```text
plugin manifest
plugin.wasm
webview/
  bundle.js
  styles.css
```

The manifest declares both core and client-facing capabilities:

```text
id
name
version
core capabilities
  analyzers
  query extensions
  exporters
  commands
extension capabilities
  toolbar actions
  context menus
  settings sections
  webview slots
  graph overlays
assets
  webview bundle paths
```

Wasm plugins are the clean long-term shape for core behavior. They let Rust,
TypeScript, or other languages compile into a portable plugin format while
avoiding platform-specific native plugin binaries. Native Rust plugins are
possible, but Rust does not have a stable native ABI, so that route is likely
harder to distribute safely.

Webview assets can remain JavaScript because they run in the webview/browser
surface. That does not weaken the Rust core model; it just means plugin UI code
lives at the UI seam while plugin facts and commands live at the core seam.

### Extension Plugin Flow

The VS Code extension does not discover plugins independently. It asks the core:

```text
listPluginContributions(workspace)
```

The core responds with descriptors for the enabled plugins:

```text
toolbar actions
context menu entries
settings sections
webview asset URIs or asset handles
command ids
```

When the user clicks a plugin action:

```text
user clicks plugin toolbar action
  -> webview sends action to TS extension
  -> extension calls `invokePluginCommand` over `codegraphy stdio`
  -> Rust core runs the plugin command
  -> core returns graph diff, data update, or command result
  -> extension/webview updates UI
```

That keeps plugin behavior central while still allowing rich extension UI.

### Plugin Data Flow

```text
Plugin analyzer
  -> emits facts through Rust core
  -> core writes plugin-owned rows into SQLite
  -> query/projection includes enabled plugin facts
  -> extension receives graph projection/diff
  -> WebGPU graph updates visible buffers

Plugin UI action
  -> extension forwards command to core
  -> core updates plugin data/facts
  -> extension receives result or graph diff
```

### WebGPU Implication For Plugins

The current plugin API can let plugins draw runtime graph UI through webview
slots and overlays. A WebGPU renderer makes that more deliberate, and the
preferred direction is to keep plugins out of the raw graph renderer.

TS visual plugins should interface with the React/webview layout, not with the
WebGPU graph internals. A particles plugin can render a transparent animated
background by injecting into a specific HTML slot behind the graph. A panel
plugin can render into a side panel or toolbar slot. Neither needs direct node,
edge, picking, or shader access.

Plugin rendering should split into:

- React/webview UI slots for panels, controls, windows, and DOM overlays;
- background or foreground effect slots hosted by the webview shell;
- command descriptors that call back into core plugin behavior;
- optional future declarative graph styling metadata from core projection data.

Avoid giving plugins direct raw access to the WebGPU renderer at first. That
would make renderer internals part of the plugin interface too early.

If a plugin needs to change graph facts, filters, queries, or styling, the change
should flow through core and return to the webview as normal graph projection
data. The extension should still only render the active plugin UI descriptors
reported by core.

### Companion VS Code Extensions

The default should be core-installed CodeGraphy plugins, not separate VS Code
extensions. A separate VS Code companion extension could exist for extreme
host-specific integrations, but it should be the exception.

Most plugins should be installable once through the core and usable from CLI,
MCP, and VS Code.

## Similar Project Comparisons

This brainstorm is not inventing a totally strange architecture. Several
projects use pieces of the same shape.

### rust-analyzer

Pattern:

```text
Rust analysis engine
  -> language server binary
  -> editor clients through LSP
```

Useful precedent:

- The core engine is Rust, but editor clients can be any editor that speaks LSP.
- The architecture separates internal analysis crates from the LSP-facing binary.
- The `ide` crate is treated as the useful client-facing interface, while the
  LSP crate handles JSON/protocol translation.
- It keeps source/project input in memory, applies small deltas, and computes
  derived analysis lazily.
- rust-analyzer also uses a separate process for proc macros because third-party
  code can panic, crash, or behave nondeterministically.

CodeGraphy lesson:

- Keep a real Rust core interface behind the stdio protocol.
- Treat `codegraphy stdio` as a protocol adapter, not as the core itself.
- Keep plugin execution isolated enough that bad plugins cannot crash the whole
  product when avoidable.

Sources:

- [rust-analyzer introduction](https://rust-analyzer.github.io/book/)
- [rust-analyzer architecture](https://rust-analyzer.github.io/book/contributing/architecture.html)

### VS Code Language Server Pattern

Pattern:

```text
VS Code extension
  -> starts a separate process
  -> communicates over protocol
  -> process can be written in any language
```

Useful precedent:

- VS Code documents that a language client runs in the Node extension host,
  starts a language server in another process, and communicates through LSP.
- VS Code calls out the two big wins: the server can be written in any language,
  and it can be reused by multiple editors.

CodeGraphy lesson:

- `codegraphy stdio` is a natural fit. It can be CodeGraphy's protocol, even if
  it is not literally LSP.
- The extension should remain a client/controller over a long-lived process.

Source:

- [VS Code Programmatic Language Features](https://code.visualstudio.com/api/language-extensions/programmatic-language-features)

### Biome

Pattern:

```text
Rust toolchain binary
  -> CLI
  -> language server
  -> VS Code extension talks to the binary/LSP
```

Useful precedent:

- Biome's VS Code extension is a UI/editor integration over a real binary.
- Multi-root workspaces create a Biome instance per workspace folder.
- Users can override the binary path with `biome.lsp.bin`.
- Biome documents platform-specific binary package paths.
- It also has a Windows-specific option to run from a temporary location because
  active LSP sessions can lock binaries.

CodeGraphy lesson:

- One `codegraphy stdio` process per VS Code window or workspace folder is not
  weird.
- Binary discovery, version matching, and process lifecycle are product
  features, not afterthoughts.
- Windows binary locking needs to be considered if the extension runs a bundled
  or workspace-installed `codegraphy` binary.

Source:

- [Biome VS Code extension reference](https://biomejs.dev/reference/vscode/)

### Deno

Pattern:

```text
Deno CLI
  -> Deno language server
  -> VS Code extension requires/uses the installed CLI
```

Useful precedent:

- The Deno VS Code extension is powered by the Deno language server.
- The extension expects a Deno CLI executable and lets users set `deno.path`.
- Editor features intentionally align with CLI behavior: module resolution,
  cache, lint, format, tasks, and config all come from Deno.

CodeGraphy lesson:

- CodeGraphy's VS Code extension can require or bundle the `codegraphy` binary
  and treat the CLI/core as the product source of truth.
- Keeping editor behavior aligned with CLI behavior is a feature, not a
  compromise.

Source:

- [Deno VS Code extension README](https://github.com/denoland/vscode_deno)

### SWC

Pattern:

```text
Rust compiler platform
  -> Rust/JS usage surfaces
  -> plugins compiled to Wasm
```

Useful precedent:

- SWC is a Rust-based platform used by JS tooling.
- SWC plugins are written in Rust and built as `.wasm`.
- The documented plugin flow targets Wasm, including WASI.

CodeGraphy lesson:

- Wasm plugins are a proven path for a Rust core that wants portable plugin
  execution.
- Wasm works especially well for core facts/analysis/transforms, not direct UI.

Sources:

- [SWC overview](https://swc.rs/)
- [SWC plugin guide](https://swc.rs/docs/plugin/ecmascript/getting-started)

### Oxc / Oxlint

Pattern:

```text
Rust JS toolchain
  -> CLI/editor integrations
  -> Rust core
  -> JavaScript plugin compatibility for ecosystem reach
```

Useful precedent:

- Oxc is a Rust toolchain with parser/linter/formatter pieces.
- Oxlint supports JavaScript plugins, including npm plugins, with an
  ESLint-compatible API.
- The JS plugin support is currently alpha, but the direction is important:
  a Rust core can still support an existing JS plugin ecosystem through a
  compatibility host.

CodeGraphy lesson:

- The dream architecture does not have to choose between Rust/Wasm plugins and
  TypeScript plugins forever.
- A Rust core could support Wasm plugins as the native future and a JS plugin
  host as a compatibility/adoption layer.

Sources:

- [Oxc overview](https://oxc.rs/)
- [Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins)

### Zed

Pattern:

```text
Rust editor
  -> extensions written in Rust
  -> compiled to WebAssembly
  -> extension API exposed through Rust crate/WIT-style interface
```

Useful precedent:

- Zed extensions are developed with Rust and a manifest.
- `zed_extension_api` exposes process, LSP, HTTP client, settings, and a
  registration macro.
- Zed's own extension story shows Rust + Wasm + typed extension contracts can be
  a serious product architecture.

CodeGraphy lesson:

- A typed plugin interface can be larger than pure analysis: it can include
  process/LSP helpers, settings, and integration utilities.
- Wasm plugins are credible for editor-adjacent extensibility, but UI extension
  scope should be designed carefully.

Sources:

- [Zed developing extensions](https://zed.dev/docs/extensions/developing-extensions)
- [zed_extension_api docs](https://docs.rs/zed_extension_api/latest/zed_extension_api/)

### Lapce

Pattern:

```text
Rust editor
  -> GPU rendering through wgpu
  -> Tree-sitter and LSP
  -> plugins through WASI
```

Useful precedent:

- Lapce advertises a WASI plugin system where plugins can be written in any
  language that compiles to WASI.
- It also combines Tree-sitter, LSP, and a Rust-native performance-oriented UI
  stack.

CodeGraphy lesson:

- WASI is a reasonable target if the goal is language-agnostic portable plugins.
- CodeGraphy's WebGPU graph direction pairs naturally with a Rust/Wasm core
  ecosystem, but the VS Code webview still imposes its own constraints.

Source:

- [Lapce overview](https://lap.dev/lapce/)

### Tauri

Pattern:

```text
Rust backend
  -> web frontend
  -> command/message bridge
  -> plugins extend Rust and webview behavior
```

Useful precedent:

- Tauri apps use web UI technologies while relying on Rust-side logic.
- Tauri plugins can hook lifecycle, expose Rust code that uses webview APIs,
  and handle commands.
- Tauri explicitly keeps core smaller by adding external functionality through
  plugins.

CodeGraphy lesson:

- A Rust core plus web UI bridge is a mature pattern.
- Plugins that span backend behavior and webview-facing behavior are plausible,
  but their interface must be deliberate.

Sources:

- [Tauri overview](https://v2.tauri.app/start/)
- [Tauri plugin development](https://v2.tauri.app/develop/plugins/)

### Comparison Takeaway

The architecture we are discussing is on a well-trodden path:

```text
Rust core binary
  + protocol mode for editors/tools
  + durable local cache
  + thin clients
  + Wasm/native plugin system
  + optional JS compatibility layer
```

The most relevant combo for CodeGraphy is:

- rust-analyzer/Biome/Deno for the `codegraphy stdio` process model;
- SWC/Zed/Lapce for Wasm plugin design;
- Oxc/Oxlint for preserving a JS/TS plugin path while moving the core to Rust;
- Tauri for Rust backend plus webview client/plugin split.

## Tree-Sitter In Rust

A Rust core can still use Tree-sitter. Tree-sitter has Rust bindings and grammar
crates. This makes a Rust indexing engine plausible, including parallel parsing
and language analysis.

This is a better fit for CPU multithreading than GPU acceleration. Indexing is
mostly file IO, parsing, branching logic, strings, and graph fact generation.

## WebGPU Direction

WebGPU is most relevant to the graph view, especially the 2D graph rendering and
possibly force/layout simulation.

If CodeGraphy seriously adopts WebGPU, it probably replaces the
`react-force-graph` graph surface rather than merely tweaking it.

Possible levels:

```text
Level 1: Rust/core or JS computes positions, WebGPU renders nodes/edges.
Level 2: WebGPU renders and handles viewport-scale buffers/culling.
Level 3: WebGPU compute handles force/layout iterations too.
```

React can still own the surrounding UI:

- panels;
- toolbar;
- settings;
- search;
- context menus;
- plugin controls.

The custom WebGPU surface owns the actual 2D graph drawing.

Hard parts to account for:

- labels;
- icons/images;
- hit testing;
- selection;
- hover;
- context menus;
- edge arrows/particles;
- plugin overlays;
- accessibility;
- screenshots/export;
- stable layout persistence.

The strongest architecture is for the Rust core to return compact projections or
diffs, and for the WebGPU renderer to update GPU buffers rather than rebuilding a
large object graph every time.

## Performance Intent

Rust core targets:

- faster indexing;
- better parallelism;
- faster graph query/search/filter/sort/projection;
- less TypeScript main-thread work;
- a single query engine shared by CLI, MCP, and VS Code.

WebGPU targets:

- faster 2D rendering for large graphs;
- smoother pan/zoom/hover;
- less Canvas draw-call pressure;
- possible GPU-accelerated layout later.

The two ideas complement each other:

```text
Rust core makes the graph facts and projections faster.
WebGPU makes the visible graph surface faster.
```

## Current Dream Version

```text
Install CodeGraphy core:
  codegraphy

Use as a CLI:
  codegraphy index
  codegraphy query

Use from VS Code:
  extension starts `codegraphy stdio`
  extension provides UI over core features
  webview renders graph with WebGPU

Use from agents:
  MCP adapter uses the same Rust core/protocol

Extend with plugins:
  codegraphy plugin install <plugin>
  plugins add analyzers, graph facts, query behavior, exporters, maybe UI
```

This makes CodeGraphy feel like a local program first. VS Code becomes one
excellent visualization client, not the center of the architecture.
