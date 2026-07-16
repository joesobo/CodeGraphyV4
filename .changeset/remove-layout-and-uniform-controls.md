---
"@codegraphy-dev/extension": minor
---

Simplify Relationship Graph presentation controls by removing the radial, top-down, and left-to-right DAG layouts and the Uniform node-size mode. Existing saved DAG selections now open in the force-directed layout, and saved Uniform sizing falls back to Connections sizing.

Use the force-directed layout for graph positioning. Choose Connections when important hubs should be larger, or File Size when node area should reflect file size. These removals do not change indexed graph data, Graph Scope, filters, or plugin-contributed relationships.
