---
"@codegraphy-dev/extension": minor
---

Let active webview plugins own their own Graph View UI state.

The extension now persists plugin-owned webview data under `pluginData` and replays it back to the matching plugin, so UI contributed by a plugin can restore its workspace settings without becoming a first-class extension setting. This keeps plugin-injected surfaces, such as the particles Theme controls, available only while their plugin is active.
