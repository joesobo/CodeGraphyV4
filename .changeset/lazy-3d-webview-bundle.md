---
"@codegraphy-dev/extension": patch
---

Speed up default Graph View startup work by lazy-loading the 3D graph runtime outside the initial 2D webview bundle and skipping settled duplicate graph payload replays.
