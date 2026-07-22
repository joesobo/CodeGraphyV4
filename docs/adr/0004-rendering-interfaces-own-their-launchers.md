# Rendering Interfaces Own Their Launchers

**Status:** Accepted

CodeGraphy Core is a headless graph engine and CLI. Products that present its
graph are independently installed rendering interfaces. Each interface owns
the user experience for its host while sharing Core's indexed graph.

**Decision**

Rendering interfaces own their installation, launch, document lifecycle, and
host-specific interaction model. They import Core to index and query a
workspace.

The VS Code extension remains a VS Code Marketplace product. The tldraw
interface will be published as `@codegraphy-dev/tldraw` with its own executable
launcher, `codegraphy-tldraw`. A user installs Core and the tldraw interface
through npm, then runs the interface launcher from the workspace:

```sh
npm install --global @codegraphy-dev/core @codegraphy-dev/tldraw
codegraphy-tldraw
```

The launcher accepts an optional `.tldraw` document path:

```text
codegraphy-tldraw
    Index the workspace through Core, save a new CodeGraphy.tldraw document in
    the workspace, and open it. Use the next available numbered name when that
    file already exists.

codegraphy-tldraw PATH
    Create PATH from the latest index when it is absent. Reconcile PATH with
    the latest index when it exists. Open the document.
```

tldraw offline creates unnamed documents through its own **New file** action.
Its local API operates on documents that are already open and does not expose
document creation. Opening a generated `.tldraw` archive also attaches that
archive's path. The pathless launcher therefore creates a new saved document
until tldraw offline provides a supported way to create an unnamed document
from an external launcher.

The interaction model is command-driven: the user runs the command, works in
the workspace, and runs the command again to see the updated graph. Each run
without a path opens a fresh canvas from the current index. Each run with a
path updates that saved canvas. The MVP does not update a canvas without the
user running the command.

The launcher exits after completing the operation. The generated document
contains the persistent script that continues running the force simulation in
tldraw offline.

The launcher writes the versioned `.tldraw` ZIP and SQLite document format.
When a requested path is closed, it reads the document, reconciles the graph,
writes the updated archive atomically, and opens it. When the exact path is
already open, the launcher reads tldraw offline's per-launch bearer token and
uses its loopback HTTP API to reconcile the live editor. It does not rewrite
an open archive. The tldraw agent skill is not required.

The dependency and responsibility boundaries are:

```text
VS Code interface ----> Core <---- analysis plugins
tldraw interface  ----> Core
future interfaces ----> Core

rendering interfaces ----> graph-renderer physics/layout
VS Code Graph View ------> graph-renderer WebGPU drawing
tldraw interface --------> native tldraw shapes
```

Core owns workspace discovery, indexing, graph semantics, settings that affect
the indexed graph, and cache data. The tldraw interface calls Core's public API
to run the normal index and obtain the default file-level graph shown by a fresh
Extension workspace. Core retains ownership of its cache representation.

`graph-renderer` supplies the same force-directed physics implementation and
configuration used by the Extension. The physics engine is deterministic
WebAssembly with no WebGPU or Node dependency, so it runs inside tldraw
offline's document-script environment. That environment provides only the
`tldraw`, React, and React DOM modules plus relative imports, so the launcher
bundles the physics runtime into the document's `script/` files and embeds the
compiled WebAssembly bytes directly, installing them through the engine's
module-injection seam instead of a URL fetch. The tldraw interface translates
indexed graph entities and calculated positions into native tldraw circles and
connectors. The persistent document script keeps those shapes synchronized with
the simulation while the user interacts with the canvas.

tldraw offline asks for script consent tied to the exact script contents, and
re-asks whenever the script changes. The CodeGraphy document script is
therefore a stable, versioned artifact: it reads graph data from
document-stored records and shape metadata rather than having data generated
into it. A refresh rewrites data, not the script, so an already-trusted
document stays trusted. The script only changes when the installed interface
version changes.

A path-based refresh reindexes through Core and reconciles CodeGraphy-owned
shapes by stable identity: each CodeGraphy-owned shape stores its graph entity
identifier in shape metadata. New graph entities are added, changed entities
are updated, and removed entities are deleted. User-created notes, drawings,
and other shapes remain untouched, and user adjustments to CodeGraphy-owned
shapes (position, styling) are preserved when the underlying entity still
exists. Every successful command opens the resulting canvas through the
operating system's file association; foregrounding an already-open window is
best effort.

Rendering interfaces are also distinct from plugins:

- A Core plugin changes indexing, graph semantics, or cache-relevant analysis.
- A rendering interface consumes Core and presents the graph.
- A host plugin changes one rendering interface's presentation or interaction.

**Resulting Contract**

- Core remains directly usable as a headless library and CLI.
- Installing the tldraw package adds the `codegraphy-tldraw` launcher.
- The Extension and tldraw share Core and physics behavior while retaining
  host-specific rendering and document models.
- Each interface can evolve its own UI and host-specific plugin seam.
- A saved tldraw canvas is user-authored project material. Refresh reconciles
  CodeGraphy-owned shapes while preserving the user's canvas additions.
- The rerun of `codegraphy-tldraw` is the only update trigger in the MVP. A
  closed document refreshes on disk. An open document refreshes in place
  through tldraw offline's authenticated local API.
- The document script is stable across refreshes so trusted documents do not
  re-prompt for script consent.
- The first compatibility proof uses the repository's complete `examples/`
  directory as its workspace fixture. It generates a path-based document,
  opens it in tldraw offline, renders native shapes, and visibly runs the shared
  physics simulation.
- The ownership acceptance check adds a native tldraw note, changes the
  workspace, reruns the command, and verifies that the open canvas shows the
  updated graph and the preserved note without a new script-consent prompt.
