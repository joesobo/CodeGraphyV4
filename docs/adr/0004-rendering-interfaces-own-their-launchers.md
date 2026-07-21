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
    Create PATH when it is absent. Reconcile PATH when it exists and is not
    open in tldraw offline. Open the document afterward.
```

The launcher exits after completing the operation. The generated document
contains the persistent script that continues running the force simulation in
tldraw offline.

The unnamed flow uses tldraw offline's legacy `.tldr` import behavior: opening
a `.tldr` file imports it as an untitled document with unsaved changes and
leaves the original untouched. The launcher generates a temporary `.tldr`
document and opens it through the operating system's file association. The
compatibility proof must verify that a `.tldr` import carries the embedded
document script; if it cannot, the unnamed flow instead generates a `.tldraw`
file in a temporary location and tldraw's Save as / Rename flow assigns the
durable path.

tldraw offline does not merge external changes into an open document, and a
later in-app save can overwrite an external write. The launcher therefore
never rewrites a document that is currently open. When it detects or cannot
rule out an open working copy, it reports that the document must be closed
and reopened to pick up the refresh. Live reconciliation of an open canvas is
a follow-up that goes through tldraw offline's agent-skill channel, where
edits land in the working copy as unsaved changes for the user to review and
save.

**Considered refresh mechanisms**

- Rewrite PATH while the document is open. Rejected: tldraw offline documents
  this as unsafe — the app does not merge external content changes, and the
  user's next save silently overwrites the refresh (or the refresh clobbers
  unsaved canvas work).
- Reconcile the open canvas through the tldraw agent skills. Supported by the
  app and preserves the live session, but couples refresh to an installed AI
  tool. Deferred to a follow-up rather than required for the MVP.
- Require the document to be closed for a path refresh, then open it. Chosen
  for the MVP: it uses only documented, supported behavior.

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

An unnamed document receives its durable name and location through tldraw's
normal save flow. A path-based refresh reindexes through Core and reconciles
CodeGraphy-owned shapes by stable identity: each CodeGraphy-owned shape stores
its graph entity identifier in shape metadata. New graph entities are added,
changed entities are updated, and removed entities are deleted. User-created
notes, drawings, and other shapes remain untouched, and user adjustments to
CodeGraphy-owned shapes (position, styling) are preserved when the underlying
entity still exists. Every successful command opens the resulting canvas
through the operating system's file association; foregrounding an
already-open window is best effort.

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
- The launcher never rewrites an open document; live-canvas reconciliation is
  an agent-skill follow-up.
- The document script is stable across refreshes so trusted documents do not
  re-prompt for script consent.
- The first compatibility proof uses the repository's complete `examples/`
  directory as its workspace fixture. It generates a path-based document,
  opens it in tldraw offline, renders native shapes, and visibly runs the shared
  physics simulation. It also verifies whether a `.tldr` import carries the
  embedded document script, settling the unnamed-flow mechanism.
- The MVP then adds unnamed-document launch and ownership-aware path refresh.
  Its acceptance check adds a native tldraw note, closes the document,
  refreshes after a workspace change, reopens without a new script-consent
  prompt, and verifies that the graph updates while the note remains.
