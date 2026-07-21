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

The package may also support one-off npm execution.

The launcher accepts an optional `.tldraw` document path:

```text
codegraphy-tldraw
    Create a new unnamed, unsaved document and open it in tldraw offline.

codegraphy-tldraw PATH
    Create PATH when it is absent. Reconcile PATH when it exists. Open the
    document in tldraw offline or refresh its visible canvas when already open.
```

The launcher exits after completing the operation. The generated document
contains the persistent script that continues running the force simulation in
tldraw offline.

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
configuration used by the Extension. The tldraw interface translates indexed
graph entities and calculated positions into native tldraw circles and
connectors. The persistent document script keeps those shapes synchronized with
the simulation while the user interacts with the canvas.

An unnamed document receives its durable name and location through tldraw's
normal save flow. A path-based refresh reindexes through Core and reconciles
CodeGraphy-owned shapes by stable identity. New graph entities are added,
changed entities are updated, and removed entities are deleted. User-created
notes, drawings, and other shapes remain untouched. When the document is open,
the reconciliation updates the live document and preserves the current tldraw
session. Every successful command opens or foregrounds the resulting canvas.

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
- The first compatibility proof uses the repository's complete `examples/`
  directory as its workspace fixture. It generates a path-based document,
  opens it in tldraw offline, renders native shapes, and visibly runs the shared
  physics simulation.
- The MVP then adds unnamed-document launch and ownership-aware path refresh.
  Its acceptance check adds a native tldraw note, refreshes after a workspace
  change, and verifies that the graph updates while the note remains.
