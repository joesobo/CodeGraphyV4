---
"@codegraphy/extension": patch
---

Fix timeline history playback so commit graphs stop pulling in unsupported files from old diffs, resolve plugin file lookups against each commit instead of the current workspace, refresh Material legend groups when you jump between commits, and allow third-party plugins to contribute timeline edges from commit-local state. Timeline commits with no graphable files now show a commit-specific empty state instead of the generic “open a folder” message.
