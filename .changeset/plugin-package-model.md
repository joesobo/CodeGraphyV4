---
"@codegraphy-dev/core": minor
"@codegraphy-dev/extension": patch
"@codegraphy-dev/plugin-typescript": minor
"@codegraphy-dev/plugin-python": minor
"@codegraphy-dev/plugin-csharp": minor
"@codegraphy-dev/plugin-godot": minor
"@codegraphy-dev/plugin-markdown": minor
"@codegraphy-dev/plugin-api": minor
---

Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.
