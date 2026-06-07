---
"@codegraphy-dev/extension": patch
"@codegraphy-dev/core": patch
---

Keep disabled plugins fully inactive across Graph View surfaces.

When a workspace disables a plugin, CodeGraphy now excludes that plugin's graph analysis contributions, default filter groups, Graph Scope Node Type and Edge Type definitions, Edge Type capabilities, Graph View contribution statuses, toolbar/context/export actions, and webview assets. This keeps disabled plugins from leaving behind toggles or UI actions for features that are no longer active.
