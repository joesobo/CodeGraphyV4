# Godot Example

This example workspace is used by CodeGraphy's extension-host e2e tests for the
GDScript plugin and doubles as a small Godot project you can open in VS Code to
try the Graph View.

Project shape:

- `project.godot` boots into `scenes/main.tscn`
- `scripts/game_manager.gd` is configured as an autoload singleton
- `scenes/player.tscn`, `scenes/enemy.tscn`, and `scenes/ui/game_ui.tscn` make the project feel like a real Godot workspace instead of isolated fixture files
- `resources/player_loadout.tres` is a real data resource backed by `scripts/data/player_loadout.gd`

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
