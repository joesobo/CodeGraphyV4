---
"@codegraphy-dev/tldraw": minor
---

Refresh an open tldraw graph in place after workspace changes. CodeGraphy keeps
user notes, drawings, images, other media, surviving node positions, manual node
sizes, and custom styles while it updates generated graph content.

Reject unsupported tldraw documents before replacing them, so a refresh cannot
silently discard an incompatible canvas.
