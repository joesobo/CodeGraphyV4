---
"@codegraphy-dev/extension": patch
---

Graph View file and folder creation now supports safe nested relative paths, such as `a/b/c/d.ts`, while create and rename prompts reject names that could escape or move outside the selected folder.
