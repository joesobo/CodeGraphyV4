---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Fix Java graph relationships in the basic file view. The Java graph now counts the import and call from App.java to Helper.java as two connections collapsed into one visible edge, while superclass declarations no longer add an extra BaseService.java file connection.
