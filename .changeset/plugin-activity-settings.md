---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Persist workspace plugin activity by Plugin ID with an explicit enabled state.

New workspaces now write Markdown as an enabled plugin intent entry, and plugin toggles keep `enabled: false` entries when users disable a plugin. CodeGraphy uses the Plugin ID from static plugin metadata to resolve installed package runtimes, so disabled plugins keep their user intent and plugin-owned data without loading runtime code.
