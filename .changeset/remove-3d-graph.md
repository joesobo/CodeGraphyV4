---
"@codegraphy-dev/plugin-api": major
"@codegraphy-dev/core": major
"@codegraphy-dev/extension": minor
"@codegraphy-dev/plugin-unity": patch
---

CodeGraphy now provides one supported 2D Relationship Graph and removes the 3D graph mode, its toolbar toggle, 3D node shapes, 3D camera state, and Three.js renderer settings. Existing workspaces open directly in the 2D graph; saved 3D preferences are ignored.

This is a breaking Plugin API change. Plugin authors must remove `GraphNodeShape3D`, `shape3D`, `graphMode`, three-dimensional node coordinates (`z`, `fz`, and `vz`), and 3D values in selected-node position payloads. Graph View contributions, drag callbacks, context-menu selectors, and viewport adapters now receive only two-dimensional graph state. The Unity plugin continues to contribute Unity graph data but no longer supplies 3D presentation metadata.
