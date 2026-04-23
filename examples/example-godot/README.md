# Godot Example

This example workspace is used by CodeGraphy's extension-host e2e tests for the
GDScript plugin and doubles as a small Godot project you can open in VS Code to
try the graph views.

Project shape:

- `project.godot` boots into `scenes/main.tscn`
- `scripts/game_manager.gd` is configured as an autoload singleton
- `scenes/player.tscn`, `scenes/enemy.tscn`, and `scenes/ui/game_ui.tscn` make the project feel like a real Godot workspace instead of isolated fixture files
- `resources/player_loadout.tres` is a real data resource backed by `scripts/data/player_loadout.gd`

Suggested depth-view check:

1. Open this folder in VS Code.
2. Open `scripts/player.gd`.
3. Run `CodeGraphy: Open`.
4. Switch to `Depth Graph`.
5. Move the depth slider from `1` to `2`.

Expected behavior:

- Depth `1` shows `scripts/player.gd` plus its immediate GDScript neighbors.
- Depth `2` adds `scripts/base/entity.gd` through the `enemy.gd` dependency.
- `project.godot` stays out of the local depth graph because it is not connected to `player.gd`.

Suggested scene/resource check:

1. Open `scenes/ui/loadout_preview.tscn` or `resources/player_loadout.tres`.
2. Run `CodeGraphy: Open`.
3. Switch to `Depth Graph`.

Expected behavior:

- `resources/player_loadout.tres` creates static `load` edges to `scripts/data/player_loadout.gd` and `textures/player_card.png`.
- `scenes/ui/loadout_preview.tscn` creates static `load` edges to `resources/player_loadout.tres`, `scripts/ui/loadout_preview.gd`, and `textures/player_card.png`.
- `scripts/player.gd` creates static `load` edges to `scenes/ui/loadout_preview.tscn` and `resources/player_loadout.tres`.
- Those edges come from the Godot plugin's `ext-resource` source, not a custom edge kind.
- The `.tscn` and `.tres` files in this fixture use relative `path=` values, and the scene points at the resource with both `uid=` and `path=` so CodeGraphy exercises the same fallback order Godot uses.
