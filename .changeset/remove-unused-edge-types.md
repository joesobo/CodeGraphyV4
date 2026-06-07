---
"@codegraphy-dev/plugin-api": major
"@codegraphy-dev/extension": patch
"@codegraphy-dev/core": patch
---

Remove the unused Tests and Re-exports edge types from Graph Scope.

Export-from relationships now appear as Imports instead of a separate Re-exports edge, so users have fewer duplicate-looking edge toggles to reason about.
