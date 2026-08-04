---
"@codegraphy-dev/extension-plugin-api": major
---

Replace the generic `graph.panelSlot` and declarative panel view with the host-managed `registerPanelContribution` lifecycle. Plugin panels now register closed, share one exclusive panel region with built-in panels, support reopenable handles, and can synchronously prevent default Escape dismissal.
