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

- `Scene` nodes from `.tscn` files.
- `Resource` nodes from `.tres` files.
- `Autoload` nodes from `project.godot` `[autoload]` entries.
- `Scene Node` nodes from `[node ...]` entries in scenes.
- `Signal` nodes from GDScript `signal` declarations.
- `Exported Property` nodes from `@export` declarations.
- `Contains` edges from files/scenes/scripts to those owned concepts.
- `Signal Connections` edges from `connect(...)`, scene `[connection]` entries, and signal emit paths when the target can be resolved.

One implementation gap is known before the acceptance gate: the plugin extracts `variable` symbols, but `contributeGraphScopeCapabilities()` does not currently declare the generic variable node capability. The acceptance contract should require `Variable`; after human acceptance, the implementation slice should add the failing test and minimal capability fix. The Godot-owned node and edge rows above will also need plugin node/edge definitions, capability declarations, extraction, step bindings, and generated Playwright tests after the human commits the spec.

## Example

The integrated example remains `examples/example-godot`. It demonstrates:

- `project.godot` project-settings loads for the main scene and autoload singleton.
- `.tscn` and `.tres` `ext_resource` loads.
- GDScript `preload(...)` loads.
- File-backed inheritance from `Enemy` and `Player` to `Entity`.
- `class_name` references from typed variables and return types. The autoload singleton is named `GameManager`; its script class is `GameSessionManager` so Godot can compile it without hiding the singleton.
- A static call from `Enemy` to `MathHelpers`.
- Shared `Entity` health plumbing through `HealthComponent`.
- Player click-shooting through `Projectile`, enemy chase/attack behavior, continuous spawning through `EnemySpawner`, compact UI controls, and player/enemy healthbars.
- Scene nodes, groups, script attachments, exported properties, onready unique-name references, and signal declarations.
- Signal wiring through `enemy_spawner.enemy_spawned.connect(...)`, `health_component.died.connect(...)`, and projectile hit signals.
- GDScript `Function`, `Enum`, `Constant`, `Variable`, and `Godot class_name` symbol nodes.

Measured current parser/plugin output after the Godot-developer example update:

- 24 displayed file nodes.
- 20 Godot-supported files.
- 27 `Loads` edges.
- 23 parser-emitted `References` edges, which project to 12 visible file-to-file reference edges.
- 1 `Calls` edge.
- 2 `Inherits` edges.
- 12 `Godot class_name` symbols.
- 48 `Function` symbols.
- 77 parser-emitted `Variable` symbols, which collapse to 74 unique visible `Variable` node ids.
- 2 `Constant` symbols.
- 1 `Enum` symbol.

## Acceptance Gate

`packages/extension/tests/acceptance/specs/godot-example.md` is human-owned Markdown. It should remain local and uncommitted until human review. After the human commits the accepted spec, continue with generated Playwright tests, focused failing unit tests, and minimal implementation.
