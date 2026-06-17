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
- Dynamic `load(...)` is parser-detected, but the example currently uses static `preload(...)` and text-resource/project settings for stable fixture counts.

The upgraded contract should go beyond the current parser surface. Godot developers expect the graph to expose:

- `Godot Scene` nodes from `.tscn` files.
- `Godot Resource` nodes from `.tres` files.
- `Godot Autoload` nodes from `project.godot` `[autoload]` entries.
- `Godot Scene Node` nodes from `[node ...]` entries in scenes.
- `Godot Signal` nodes from GDScript `signal` declarations.
- `Godot Exported Property` nodes from `@export` declarations.
- `Contains` edges from files/scenes/scripts to those owned concepts.
- `Godot Signal Connections` edges from `connect(...)`, scene `[connection]` entries, and signal emit paths when the target can be resolved.

One implementation gap is known before the acceptance gate: the plugin extracts `variable` symbols, but `contributeGraphScopeCapabilities()` does not currently declare the generic variable node capability. The acceptance contract should require `Variable`; after human acceptance, the implementation slice should add the failing test and minimal capability fix. The Godot-owned node and edge rows above will also need plugin node/edge definitions, capability declarations, extraction, step bindings, and generated Playwright tests after the human commits the spec.

## Example

The integrated example remains `examples/example-godot`. It demonstrates:

- `project.godot` project-settings loads for the main scene and autoload singleton.
- `.tscn` and `.tres` `ext_resource` loads.
- GDScript `preload(...)` loads.
- File-backed inheritance from `Enemy` to `Entity`.
- `class_name` references from typed variables and return types.
- A static call from `Enemy` to `MathHelpers`.
- Composition through `HealthComponent`.
- Scene nodes, groups, script attachments, exported properties, onready unique-name references, and signal declarations.
- Signal wiring through `player.loadout_opened.connect(...)` and `health_component.died.connect(...)`.
- GDScript `Function`, `Enum`, `Constant`, `Variable`, and `Godot class_name` symbol nodes.

Measured current parser/plugin output after the Godot-developer example update:

- 21 displayed file nodes.
- 17 Godot-supported files.
- 24 `Loads` edges.
- 17 parser-emitted `References` edges, which project to 11 visible file-to-file reference edges.
- 1 `Calls` edge.
- 1 `Inherits` edge.
- 9 `Godot class_name` symbols.
- 33 `Function` symbols.
- 44 parser-emitted `Variable` symbols, which collapse to 43 unique visible `Variable` node ids.
- 2 `Constant` symbols.
- 1 `Enum` symbol.

## Acceptance Gate

`packages/extension/tests/acceptance/specs/godot-example.md` is human-owned Markdown. It should remain local and uncommitted until human review. After the human commits the accepted spec, continue with generated Playwright tests, focused failing unit tests, and minimal implementation.
