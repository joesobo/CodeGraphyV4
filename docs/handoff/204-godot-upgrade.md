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

The implemented parser/plugin support covers these generic CodeGraphy concepts:

- Node types: `Function`, `Enum`, `Constant`, `Variable`, and plugin-owned `Godot class_name`.
- Edge types: `Loads`, `Inherits`, `References`, `Calls`, and `Contains`.
- Dynamic `load(...)` is parser-detected, but the example currently uses static `preload(...)` and text-resource/project settings for stable fixture counts.

The upgraded Godot-specific graph surface exposes:

- `Scene` nodes from `.tscn` files.
- `Resource` nodes from `.tres` files.
- `Autoload` nodes from `project.godot` `[autoload]` entries.
- `Scene Node` nodes from `[node ...]` entries in scenes.
- `Signal` nodes from GDScript `signal` declarations.
- `Exported Property` nodes from inline and standalone `@export` declarations.
- `Contains` edges from files/scenes/scripts to those owned concepts.
- `Signal Connections` edges from declared GDScript signals to receiver scripts for resolvable `connect(...)` calls.

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

- 23 displayed file nodes.
- 20 Godot-supported files.
- 25 `Loads` edges.
- 23 parser-emitted `References` edges, which project to 12 visible file-to-file reference edges.
- 1 `Calls` edge.
- 2 `Inherits` edges.
- 12 `Godot class_name` symbols.
- 48 `Function` symbols.
- 76 parser-emitted `Variable` symbols, which collapse to 73 unique visible `Variable` node ids.
- 3 `Constant` symbols.
- 1 `Enum` symbol.

Acceptance-owned Godot upgrade counts now require the implemented plugin surface to expose:

- 5 `Scene` nodes.
- 1 `Resource` node.
- 1 `Autoload` node.
- 30 `Scene Node` nodes.
- 8 `Signal` nodes.
- 23 `Exported Property` nodes.
- 80 `Contains` edges when the Godot-owned node rows plus `Godot class_name` are visible together.
- 5 `Signal Connections` edges from the example's `connect(...)` calls.

## Acceptance Gate

The human-owned acceptance specs for this lane are Gherkin feature files under `packages/extension/tests/acceptance/specs/**/*.feature`. The Godot acceptance gate has been reviewed and committed by the human, so implementation work now proceeds through focused failing unit tests, minimal fixes, targeted verification, and CI.
