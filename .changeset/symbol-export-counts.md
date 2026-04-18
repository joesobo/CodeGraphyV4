---
"@codegraphy/extension": patch
"@codegraphy/quality-tools": patch
---

Fix symbol JSON exports to use normalized file paths and correct per-file symbol and relation counts, and fail fast when mutation testing is pointed at the whole repo instead of a package-scoped target.
