---
"@codegraphy/extension": patch
---

Fix timeline playback dropping graph connections by waiting for the initial graph analysis before indexing history, invalidating stale timeline caches when external plugins register, and keeping view changes synced to the active timeline commit.
