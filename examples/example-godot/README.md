# Godot Example

This example workspace is used by CodeGraphy's extension-host e2e tests for the
GDScript plugin and doubles as a small Godot project you can open in VS Code to
try the graph views.

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
