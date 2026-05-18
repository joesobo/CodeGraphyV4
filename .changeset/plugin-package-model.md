---
"@codegraphy/core": minor
"@codegraphy/extension": patch
"@codegraphy/plugin-typescript": minor
"@codegraphy/plugin-python": minor
"@codegraphy/plugin-csharp": minor
"@codegraphy/plugin-godot": minor
"@codegraphy/plugin-markdown": minor
"@codegraphy/plugin-api": minor
---

Move CodeGraphy language plugins to headless npm packages under the `@codegraphy/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.
