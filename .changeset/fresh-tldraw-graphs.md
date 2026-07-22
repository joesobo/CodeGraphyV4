---
"@codegraphy-dev/tldraw": minor
"@codegraphy-dev/graph-renderer": minor
"@codegraphy-dev/core": minor
---

Add the `codegraphy-tldraw` workspace launcher with native tldraw shapes, deterministic cool file-extension colors, embedded Material Icon Theme file icons, drawn node outlines, black draw-font labels below each node, collision spacing, persistent shared force physics, and live force controls that use the Extension defaults, velocity decay, and force mapping. The force controls use tldraw theme colors and a 5–100 link-distance range. Physics-driven shape updates no longer restart the simulation, so collision handling can settle. A pathless rerun refreshes the workspace's stable `CodeGraphy.tldraw`; saved-document reconciliation and live refresh keep open canvases current.

Normalize tldraw canvas geometry to the Extension's physics scale. Dragged nodes now pin and reheat the shared simulation while they follow the pointer, move connected neighbors through link forces, and release back into the layout when the drag ends.

Rebuild collision radii and scale repel strength from resized tldraw node dimensions so enlarged nodes push nearby nodes farther away without changing the default graph behavior.

Allow rendering interfaces to prepare graph physics from embedded WebAssembly bytes.
