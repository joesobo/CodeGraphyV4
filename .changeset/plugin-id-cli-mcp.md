---
"@codegraphy-dev/core": patch
"@codegraphy-dev/mcp": patch
---

Make CLI and MCP plugin enablement use Plugin ID activity.

`codegraphy plugins enable` and `codegraphy plugins disable` now resolve package-name input to the static Plugin ID before writing workspace settings, list enabled plugins by Plugin ID, and keep disabled plugins as `enabled: false` intent instead of removing them. MCP enable and disable tools now accept `pluginId` so agents use the same workspace activity identity as Core.
