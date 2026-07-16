---
"@codegraphy-dev/extension": patch
---

Add an optional `FPS · ms` readout to the Relationship Graph's Performance settings. FPS is measured from the intervals between successfully completed rendered frames, while `ms` reports average CPU time spent running graph simulation and rendering work.

The readout waits for two successful frames before showing FPS, excludes rejected GPU submissions and stale renderer generations, and returns to `— FPS · — ms` when the demand-driven graph becomes idle. The setting is off by default and persists per CodeGraphy Workspace.
