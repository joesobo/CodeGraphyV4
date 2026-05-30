---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
"@codegraphy-dev/plugin-api": patch
---

Keep Symbol-scoped Graph View payloads small by caching baseline file relationships first, lazily enriching Symbols and plugin analysis when those scopes are enabled, and reusing enriched cache tiers when they are toggled back on.
