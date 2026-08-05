---
"@codegraphy-dev/extension-plugin-api": major
"@codegraphy-dev/plugin-godot": patch
"@codegraphy-dev/plugin-particles": patch
"@codegraphy-dev/plugin-unity": patch
---

Extension Plugin API 2 replaces `graph.panelSlot` and the declarative panel view with `registerPanelContribution`. Plugin panels now register closed, share one exclusive region with built-in panels, and return a handle that can reopen the same panel. Update Extension plugin descriptors to require `apiVersion: "^2.0.0"`. Plugins can use `onEscape` to close one nested layer before the host closes the panel.
