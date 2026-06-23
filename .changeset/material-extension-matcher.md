---
"@codegraphy-dev/extension": patch
---

Speed up stale cached startup and existing-file live updates by reusing prepared startup state, deferring live gitignore probing until the background index refresh, warming the repo-local Graph Cache before the first replay needs it, and reusing current discovery for saved-file refreshes.
