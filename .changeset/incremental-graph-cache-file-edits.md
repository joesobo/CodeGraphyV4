---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Saved-file updates now patch changed Graph Cache rows instead of rewriting the whole Graph Cache. On the current `main` versus PR CodeGraphy monorepo benchmark, edit persistence improved from a 25,705ms average full save to a 341ms average one-row patch: 25,364ms faster, a 98.67% reduction, and 75.47x faster.

Full Re-index still replaces the complete Graph Cache, while normal add, change, and delete file updates delete and upsert only the changed cache rows inside one transaction.
