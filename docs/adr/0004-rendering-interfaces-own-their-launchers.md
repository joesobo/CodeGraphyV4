# Rendering Interfaces Own Their Launchers

**Status:** Accepted

CodeGraphy Core is a headless graph engine and CLI. Products that present its
graph are independently installed rendering interfaces, not Core plugins or
Core-managed command packages.

**Considered Options**

- Let Core install interface packages and expose their commands beneath the
  `codegraphy` executable. This creates a polished two-word command, but turns
  Core into a package manager and application host for products it should not
  know exist.
- Discover companion executables through naming conventions or `PATH`. This
  avoids a package manager in Core, but makes command discovery implicit and
  still treats interface launch as a Core concern.
- Give each interface its own installation and launcher. This makes installation
  differ by host, while preserving a one-way dependency on Core and allowing
  every interface to choose the lifecycle its environment requires.

**Decision**

Rendering interfaces own their installation, launch, document lifecycle, and
host-specific interaction model. They import Core to index and query a
workspace. Core does not discover, install, register, or name rendering
interfaces.

The VS Code extension remains a VS Code Marketplace product. The tldraw
interface will be published as `@codegraphy-dev/tldraw` with its own executable
launcher, `codegraphy-tldraw`. A user installs Core and the tldraw interface
through npm, then runs the interface launcher from the workspace to open or
refresh its canvas:

```sh
npm install --global @codegraphy-dev/core @codegraphy-dev/tldraw
codegraphy-tldraw
```

The package may also support one-off npm execution, but it will not add
`codegraphy tldraw` or a `codegraphy packages install` command to Core.

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
other shapes remain untouched. The launcher does not overwrite a closed
`.tldraw` file or save a canvas into the workspace automatically.

Rendering interfaces are also distinct from plugins:

- A Core plugin changes indexing, graph semantics, or cache-relevant analysis.
- A rendering interface consumes Core and presents the graph.
- A host plugin changes one rendering interface's presentation or interaction.

The current `plugin-particles` packaging does not fit the last boundary cleanly.
Its migration and the design of independently installable Extension-owned
plugins are intentionally handled as a separate product decision.

**Consequences**

- Installing Core alone never installs or references tldraw.
- Installing the tldraw package adds only the tldraw package's launcher; Core's
  CLI surface remains unchanged.
- The Extension and tldraw may share Core and physics behavior without sharing
  a rendering host or document model.
- An interface can evolve its own UI and plugin seam without adding DOM,
  webview, or canvas contracts to Core.
- A saved tldraw canvas is user-authored project material, not CodeGraphy cache
  data. Refresh must therefore be ownership-aware and non-destructive.
- The first tldraw implementation can stay narrow: launch, index, render native
  shapes, run forces, refresh, and preserve an added note.
