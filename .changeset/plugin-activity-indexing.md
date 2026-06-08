---
"@codegraphy-dev/core": patch
---

Honor workspace-disabled plugin IDs throughout Core indexing.

Plugins set to `enabled: false` now stay unloaded even when a caller provides the plugin runtime directly. Core derives disabled plugin decisions from Plugin Activity State before registry setup, analysis, graph building, and lifecycle notifications.
