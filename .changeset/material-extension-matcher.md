---
"@codegraphy-dev/extension": patch
---

Speed up stale cached startup by reusing the prepared Material Icon extension matcher, deferring live gitignore probing until the background index refresh, and warming the repo-local Graph Cache before the first replay needs it.
