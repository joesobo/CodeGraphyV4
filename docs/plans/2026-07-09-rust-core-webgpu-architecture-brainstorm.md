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
