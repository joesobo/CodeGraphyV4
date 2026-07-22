---
'@codegraphy-dev/core': major
'@codegraphy-dev/extension': minor
'@codegraphy-dev/extension-plugin-api': minor
'@codegraphy-dev/plugin-api': major
'@codegraphy-dev/plugin-godot': patch
'@codegraphy-dev/plugin-markdown': patch
'@codegraphy-dev/plugin-particles': patch
'@codegraphy-dev/plugin-svelte': patch
'@codegraphy-dev/plugin-typescript': patch
'@codegraphy-dev/plugin-unity': patch
'@codegraphy-dev/plugin-vue': patch
---

Use one global and workspace plugin activation model for every runtime host.
Keep Core plugins headless, move VS Code Extension contracts to the Extension
Plugin API, and load active host-specific plugins only when that host opens.

Remove rendering fields and persisted view state from Core graph data. Let each
interface own its rendering and preserve optional interface data through the
open workspace `interfaces` list.
