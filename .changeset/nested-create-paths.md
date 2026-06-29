---
"@codegraphy-dev/extension": patch
---

Create file and folder actions now validate nested workspace-relative paths before touching the filesystem, create missing nested folders, and keep graph refreshes flowing for nested Explorer or external filesystem creates.
