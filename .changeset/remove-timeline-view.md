---
"@codegraphy-dev/plugin-api": major
"@codegraphy-dev/core": major
"@codegraphy-dev/extension": minor
---

CodeGraphy now opens one current-workspace Relationship Graph and removes the Timeline panel, commit-by-commit Graph Revision playback, revision controls, and Git-history Churn node sizing. Existing workspaces keep their current graph settings, but saved Timeline state and Churn sizing selections no longer affect the graph. Choose Connections or File Size for semantic node sizing.

This is a breaking Plugin API and Core package change. Plugin authors must remove the `timeline-panel` slot, Timeline lifecycle events and payloads, `timelineActive` contribution/context fields, Timeline analysis mode and `commitSha`, and the optional `churn` graph-node field. Core callers must stop passing churn counts into graph construction. Plugins should analyze the current CodeGraphy Workspace and contribute to the normal Graph View instead of branching on Timeline state.
