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
through npm, then runs the interface launcher from the workspace to open or
refresh its canvas:

```sh
npm install --global @codegraphy-dev/core @codegraphy-dev/tldraw
codegraphy-tldraw
```

The package may also support one-off npm execution.

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
the indexed graph, and cache data. `graph-renderer` owns reusable force-directed
layout and physics calculations. The tldraw interface translates indexed graph
entities and calculated positions into native tldraw shapes, so users can keep
editing the canvas while forces continue to move CodeGraphy-owned nodes.

The first tldraw launch for a workspace creates a new unsaved offline draft.
The user chooses its durable name and location through tldraw's normal save
flow. A refresh reindexes through Core and reconciles only the shapes owned by
CodeGraphy in the matching open document. User-created notes, drawings, and
other shapes remain untouched. The user remains responsible for choosing the
saved document and its location through tldraw.

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
- The first tldraw implementation can stay narrow: launch, index, render native
  shapes, run forces, refresh, and preserve an added note.
