# Trello 204 Godot Upgrade

Manual language-upgrade workstream for Trello card https://trello.com/c/WHBvghqc.

## Setup

- Branch: `codex/godot-upgrade`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/288
- Setup commit: `097a34d5b chore: start godot upgrade workstream`
- Trello moved to `In Progress` on 2026-06-16.

## Audit

The current Godot plugin is parser-backed for GDScript and text resources:

- `@gdquest/lezer-gdscript` backs GDScript statement extraction.
- `@fernforestgames/godot-resource-parser` backs `.tscn` and `.tres` `ext_resource` extraction with text fallback.
- `project.godot` remains a lightweight project-settings parser for `run/main_scene` and `[autoload]` resource settings.
- No Godot LSP, Godot CLI, external process, or semantic type checker is involved.

Current parser/plugin support is enough for these generic CodeGraphy concepts:

- Node types: `Function`, `Enum`, `Constant`, `Variable`, and plugin-owned `Godot class_name`.
- Edge types: `Loads`, `Inherits`, `References`, and `Calls`.
- Godot-specific nodes beyond `Godot class_name` are out of scope for this card.
- Dynamic `load(...)` is parser-detected, but the example currently uses static `preload(...)` and text-resource/project settings for stable fixture counts.

One implementation gap is known before the acceptance gate: the plugin extracts `variable` symbols, but `contributeGraphScopeCapabilities()` does not currently declare the generic variable node capability. The acceptance contract should require `Variable`; after human acceptance, the implementation slice should add the failing test and minimal capability fix.

## Example

The integrated example remains `examples/example-godot`. It demonstrates:

- `project.godot` project-settings loads for the main scene and autoload singleton.
- `.tscn` and `.tres` `ext_resource` loads.
- GDScript `preload(...)` loads.
- File-backed inheritance from `Enemy` to `Entity`.
- `class_name` references from typed variables and return types.
- A static call from `Enemy` to `MathHelpers`.
- GDScript `Function`, `Enum`, `Constant`, `Variable`, and `Godot class_name` symbol nodes.

Measured parser/plugin output after the enum example update:

- 19 displayed file nodes.
- 15 Godot-supported files.
- 22 `Loads` edges.
- 11 `References` edges.
- 1 `Calls` edge.
- 1 `Inherits` edge.
- 7 `Godot class_name` symbols.
- 25 `Function` symbols.
- 37 parser-emitted `Variable` symbols, which collapse to 36 unique visible `Variable` node ids.
- 2 `Constant` symbols.
- 1 `Enum` symbol.

## Acceptance Gate

`packages/extension/tests/acceptance/specs/godot-example.md` is human-owned Markdown. It should remain local and uncommitted until human review. After the human commits the accepted spec, continue with generated Playwright tests, focused failing unit tests, and minimal implementation.
