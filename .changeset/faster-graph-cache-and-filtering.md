---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Large CodeGraphy workspaces now index, save, and filter graph data much faster. On the CodeGraphy monorepo benchmark, cold indexing improved from 214.04s to 17.28s: 196.76s faster, a 91.93% reduction, and 12.39x faster. Graph Cache saves improved from 122,757ms to 10,904ms: 111,853ms faster, a 91.12% reduction, and 11.26x faster. Graph Cache size shrank from 64,638,976 bytes to 18,153,472 bytes: 46,485,504 bytes smaller, a 71.92% reduction, and 3.56x smaller.

The same benchmark now projects the current Visible Graph in 12ms instead of 775ms: 763ms faster, a 98.45% reduction, and 64.58x faster. Folder-node projection improved from 1,369ms to 32ms: 1,337ms faster, a 97.66% reduction, and 42.78x faster. Import-edge-off projection improved from 153ms to 7ms: 146ms faster, a 95.42% reduction, and 21.86x faster. Search projection improved from 781ms to 12ms: 769ms faster, a 98.46% reduction, and 65.08x faster.

Graph Cache replay also normalizes cached path separators before checking gitignore rules, so ignored files stay filtered across platforms during warm starts.
