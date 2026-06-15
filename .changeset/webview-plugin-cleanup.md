---
"@codegraphy-dev/extension": patch
"@codegraphy-dev/plugin-api": minor
"@codegraphy-dev/plugin-particles": patch
---

Dispose webview plugin work immediately when a plugin is disabled or its webview assets are reset.

Webview plugin `activate(api)` functions can now return a cleanup function or `Disposable`. CodeGraphy calls that cleanup during plugin disable/reset so plugin-owned UI can stop timers, animation loops, message subscriptions, and injected DOM without waiting for a webview reload.

The Particles plugin now uses that cleanup path to stop active background effects, clear its Theme controls, unsubscribe from plugin data updates, and remove its injected styles as soon as the plugin is disabled.
