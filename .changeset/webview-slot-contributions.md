---
"@codegraphy-dev/extension": minor
"@codegraphy-dev/plugin-api": minor
---

Add ordered webview slot contributions for plugin-owned UI.

Webview plugins can now call `api.registerSlotContribution(slot, { id, order, render })` to mount UI into named CodeGraphy slots. The host owns the contribution container, ordering, and cleanup, so plugin UI can use normal component structure without the extension needing to know what each plugin renders.
