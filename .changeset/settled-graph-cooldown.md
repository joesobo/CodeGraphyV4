---
"@codegraphy-dev/extension": patch
---

Make settled Graph Scope updates feel faster by skipping force-layout cooldown ticks when every visible node already has a position, avoiding per-edge callbacks for constant 2D arrow settings, and preventing viewport overlay updates from re-rendering the graph surface.
