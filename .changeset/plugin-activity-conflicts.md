---
"@codegraphy-dev/core": patch
---

Warn when enabled plugin IDs cannot resolve to exactly one runtime.

Enabled plugins that are missing or claimed by multiple installed packages now stay inactive before runtime import. CodeGraphy reports a developer-console warning from static metadata and does not silently choose a package or load conflicting plugin code.
