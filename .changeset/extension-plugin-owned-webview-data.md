---
"@codegraphy-dev/extension": minor
---

Let active webview plugins own their own Graph View UI state.

The extension now persists plugin-owned webview data under `pluginData` and replays it back to the matching plugin during Graph View startup and when a plugin is enabled. Plugin UI can restore workspace settings without becoming a first-class extension setting, and plugin-injected controls remain available only while their owning plugin is active.
