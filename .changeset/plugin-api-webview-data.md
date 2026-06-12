---
"@codegraphy-dev/plugin-api": minor
---

Expose plugin-owned webview data helpers to CodeGraphy plugins.

Webview plugins can now call `getPluginData()` and `setPluginData(data)` to read and persist their own workspace UI state through the host instead of using ad hoc host messages or extension-owned settings.
