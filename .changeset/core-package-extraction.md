---
"@codegraphy/core": minor
"@codegraphy/extension": patch
"@codegraphy/plugin-api": major
"@codegraphy/plugin-markdown": minor
---

Extract CodeGraphy's shared engine into `@codegraphy/core`. Core now owns headless CodeGraphy Workspace indexing, File Discovery, Tree-sitter analysis, plugin execution, Graph Cache reads/writes, workspace freshness status, and Graph Query without depending on VS Code.

The VS Code extension now acts as the visualization and editor adapter over core, and the public Plugin API is headless: VS Code-specific webview, command, decoration, and host bridge contracts stay inside the extension package.
