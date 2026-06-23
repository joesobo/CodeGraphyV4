---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Large CodeGraphy workspaces now index, save, and filter graph data much faster. On the CodeGraphy monorepo benchmark, cold indexing improved from 214.04s to 17.28s, Graph Cache saves improved from 122,757ms to 10,904ms, and the Graph Cache shrank from 64,638,976 bytes to 18,153,472 bytes.

The same benchmark now projects the current Visible Graph in 12ms instead of 775ms. Folder-node projection improved from 1,369ms to 32ms, import-edge-off projection improved from 153ms to 7ms, and search projection improved from 781ms to 12ms.
