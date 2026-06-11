---
"@codegraphy-dev/extension": minor
---

Add CodeGraphy CSS Snippets for workspace-local UI customization.

Create CSS files inside a CodeGraphy Workspace, such as `.codegraphy/snippets/animated-graph-stage.css`, then list them in `.codegraphy/settings.json` under `cssSnippets`. CodeGraphy loads the listed files into the extension webview in array order, removes stylesheets when paths are removed from settings, and keeps the paths workspace-local: absolute paths, parent traversal, non-CSS files, and missing files are skipped with `[CodeGraphy]` developer-console warnings.

The extension UI now exposes stable `data-codegraphy-*` Styling Hooks across the graph view, graph stage, search, toolbar, panels, settings sections, timeline, indexing states, and plugin slots so snippets can target CodeGraphy surfaces without depending on generated classes or rebuilding a full VS Code theme. See `docs/SETTINGS.md` and `examples/css-snippets/` for usage and demo snippets.
