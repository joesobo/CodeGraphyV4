---
"@codegraphy-dev/tldraw": minor
"@codegraphy-dev/graph-renderer": minor
---

Add the macOS `codegraphy-tldraw` workspace launcher with native tldraw shapes, a stable interface-owned file-extension palette, embedded Material Icon Theme file icons, drawn node outlines, black draw-font labels below each node, collision spacing, persistent shared force physics, and live force controls. The force controls use tldraw theme colors and a 5–100 link-distance range. Physics-driven shape updates no longer restart the simulation, so collision handling can settle. A pathless rerun refreshes the workspace's stable `CodeGraphy.tldraw`; saved-document reconciliation and live refresh keep open canvases current.

Normalize tldraw canvas geometry for graph-renderer physics. Dragged nodes now pin and reheat the shared simulation while they follow the pointer, move connected neighbors through link forces, and release back into the layout when the drag ends.

Size generated nodes from their unique connection counts with a bounded square-root scale that gives orphans, ordinary connected nodes, and hubs visibly different sizes. Refresh generated sizes when connection counts change while preserving intentional manual resizing and styling. Leave an open document in place after live reconciliation instead of reopening its stale saved archive. Rebuild collision radii and scale repel strength from visible tldraw node dimensions so generated and manually resized nodes use one stable physics model.

Preserve user-created media payloads when a closed canvas is refreshed, and reject unsupported tldraw archives before replacing them.

Allow rendering interfaces to prepare graph physics from embedded WebAssembly bytes.
