---
"@codegraphy-dev/tldraw": minor
---

Add an interactive force-directed layout to generated tldraw graphs. Dragging a
node now pulls its connected neighbors through the graph, and the layout settles
without overlapping nodes.

Use the four canvas controls to adjust repel force, center force, link distance,
and link force while the graph is open. Resizing a node also updates its
collision spacing and repel strength, so manually sized nodes remain part of the
same stable layout.

Keep larger canvases responsive while they settle by sending tldraw only the
node movement that is large enough to display and the connected shapes that
must move with it.
