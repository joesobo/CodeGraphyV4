---
"@codegraphy-dev/tldraw": minor
"@codegraphy-dev/graph-renderer": minor
"@codegraphy-dev/core": minor
---

Add the `codegraphy-tldraw` workspace launcher with native tldraw shapes, Core-resolved file-extension colors, collision spacing, persistent shared force physics, and live force controls that use the Extension defaults, ranges, velocity decay, and force mapping. Physics-driven shape updates no longer restart the simulation, so collision handling can settle. A pathless rerun refreshes the workspace's stable `CodeGraphy.tldraw`; saved-document reconciliation and live refresh keep open canvases current.

Normalize tldraw canvas geometry to the Extension's physics scale. Dragged nodes now pin and reheat the shared simulation while they follow the pointer, move connected neighbors through link forces, and release back into the layout when the drag ends.

Allow rendering interfaces to prepare graph physics from embedded WebAssembly bytes.
