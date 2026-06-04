---
"@codegraphy-dev/extension": patch
---

Update CodeGraphy's generated `.gitignore` entry from `.codegraphy/` to `.codegraphy/*`.

CodeGraphy still keeps generated workspace artifacts ignored by default, including Graph Cache files and imported assets, but the new contents-only ignore rule lets teams intentionally commit selected files under `.codegraphy/`. This matters for example projects and shared workspaces that want to version `.codegraphy/settings.json` so collaborators see the same plugin enablement, filters, Graph Scope, and Legend settings.

Existing exact `.codegraphy` or `.codegraphy/` entries are migrated to `.codegraphy/*` the next time CodeGraphy initializes workspace settings, avoiding the Git behavior where ignoring a parent directory prevents later `!` exceptions from re-including files inside it.
