# Godot Example

This example workspace is used by CodeGraphy's extension-host e2e tests for the
GDScript plugin and doubles as a small Godot project you can open in VS Code to
try the Graph View.

Project shape:

- `project.godot` boots into `scenes/main.tscn`
- `scripts/game_manager.gd` is configured as an autoload singleton
- `scenes/player.tscn`, `scenes/enemy.tscn`, and `scenes/ui/game_ui.tscn` make the project feel like a real Godot workspace instead of isolated fixture files
- `resources/player_loadout.tres` is a real data resource backed by `scripts/data/player_loadout.gd`
- `scripts/enemy.gd` extends `scripts/base/entity.gd`, giving the Godot plugin a file-backed inheritance edge distinct from built-in engine class inheritance
- `scripts/player.gd` composes a `HealthComponent`, emits `loadout_opened`, caches `%Sprite2D`, and exposes a typed exported component slot
- `scripts/game_manager.gd` declares `GameState`, signals, and spawn methods so the graph can demonstrate GDScript enum, variable, function, signal, and `class_name` symbols in one project
- `scripts/ui/game_ui.gd` backs the UI scene and references the `LoadoutPreview` scene node by unique name

Suggested Depth Mode check:

1. Open this folder in VS Code.
2. Open `scripts/player.gd`.
3. Run `CodeGraphy: Open`.
4. Turn on Depth Mode.
5. Move the depth slider from `1` to `2`.

Expected behavior:

- Depth `1` shows `scripts/player.gd` plus its immediate GDScript neighbors.
- Depth `2` adds `scripts/base/entity.gd` through the `enemy.gd` relationship.
- `project.godot` is not a universal hub; it only appears when its parsed project settings connect into the visible scene chain.

Suggested scene/resource/project-settings check:

1. Open `project.godot`, `scenes/ui/loadout_preview.tscn`, or `resources/player_loadout.tres`.
2. Run `CodeGraphy: Open`.
3. Turn on Depth Mode.

Expected behavior:

- `project.godot` creates static `load` edges to `scenes/main.tscn` from `run/main_scene` and `scripts/game_manager.gd` from `[autoload]`.
- `resources/player_loadout.tres` creates static `load` edges to `scripts/data/player_loadout.gd` and `textures/player_card.png`.
- `scenes/ui/loadout_preview.tscn` creates static `load` edges to `resources/player_loadout.tres`, `scripts/ui/loadout_preview.gd`, and `textures/player_card.png`.
- `scripts/player.gd` creates static `load` edges to `scenes/ui/loadout_preview.tscn` and `resources/player_loadout.tres`.
- Those edges come from the Godot plugin's `project-settings` and `ext-resource` sources, not custom Edge Types.
- The `.tscn` and `.tres` files in this fixture use relative `path=` values, and the scene points at the resource with both `uid=` and `path=` so CodeGraphy exercises the same fallback order Godot uses.

## Graph Screenshot

![Godot example graph screenshot](../assets/graphs/godot.png)

## Symbol Node Demo

Suggested symbol check:

1. Open Graph Scope.
2. Enable **Symbol** and **Variable**.
3. Look for Godot `class_name` symbol nodes such as `Player`, `Enemy`, `GameManager`, `PlayerLoadout`, and `LoadoutPreview`.
4. Toggle **Variable** off and back on.

Expected behavior:

- Godot `class_name` symbol nodes hide when Variable is off because they are plugin-owned variable-style declaration symbols.
- The individual Godot `class_name` row keeps its saved on/off state when Variable is toggled.
- Relationship edges such as `Player -> PlayerLoadout` and scene/resource load edges still tell the story of how the runnable project is assembled.
- `Enemy -> Entity` appears through the `Inherits` edge when Graph Scope enables that edge type.

## Supported Godot Graph Contract

This example defines the Godot graph contract the plugin should grow into. Generic CodeGraphy concepts should be used for `Function`, `Enum`, `Constant`, `Variable`, `Loads`, `Inherits`, `References`, `Calls`, and `Contains`. Godot-specific concepts should be plugin-owned rows: `Godot Scene`, `Godot Resource`, `Godot Autoload`, `Godot Scene Node`, `Godot class_name`, `Godot Signal`, `Godot Exported Property`, and `Godot Signal Connections`.

Measured current parser/plugin output for the generic surface:

- 21 displayed file nodes, including `.gitignore` and `.vscode/settings.json`; `.codegraphy/settings.json` remains workspace settings, not a graph node
- 17 Godot-supported files: `.gd`, `.godot`, `.tscn`, and `.tres`
- 24 `Loads` edges from project settings, text-resource `ext_resource` entries, and GDScript `preload`
- 17 parser-emitted `References` edges from `class_name` type usage, which project to 11 visible file-to-file reference edges
- 1 `Calls` edge from `MathHelpers.move_toward_angle`
- 1 `Inherits` edge from `Enemy` to `Entity`
- 9 `Godot class_name` symbols
- 33 `Function` symbols
- 44 parser-emitted `Variable` symbols, which collapse to 43 unique visible `Variable` node ids
- 2 `Constant` symbols
- 1 `Enum` symbol

Expected plugin-owned Godot coverage:

- `.tscn` files produce `Godot Scene` nodes and `Godot Scene Node` children for root and nested scene nodes.
- `.tres` files produce `Godot Resource` nodes.
- `project.godot` `[autoload]` entries produce `Godot Autoload` nodes.
- `signal` declarations produce `Godot Signal` nodes.
- `@export` declarations produce `Godot Exported Property` nodes.
- Scene node ownership, script ownership, signal ownership, and exported property ownership use `Contains`.
- Signal `connect(...)`, scene `[connection]`, and signal emit paths use `Godot Signal Connections`.
