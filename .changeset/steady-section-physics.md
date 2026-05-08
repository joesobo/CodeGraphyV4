---
"@codegraphy/extension": patch
---

Improve graph section interactions by moving the color picker to the frame corner, removing section double-click expand/collapse, keeping owned nodes below the section header, using center-based section physics with weighted rectangle collisions, keeping expanded sections out of the native circular collision force, keeping new sections at a stable graph-space default size, pruning redundant root ownership records, grouping persisted Graph Layout ownership by owning section, preventing expanded sections from acting like charged oversized nodes, and keeping graph physics active while dragging expanded sections.
