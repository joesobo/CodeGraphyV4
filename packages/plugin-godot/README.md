# CodeGraphy Godot

Adds Godot GDScript relationship analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Core extension: [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- Marketplace plugin: [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
- Plugin API: [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Install

1. Install the core `codegraphy.codegraphy` extension.
2. Install this plugin extension.
3. Open CodeGraphy and let it analyze your workspace.

## Detection coverage

- `.gd` files:
  - `preload()`
  - `load()`
  - `extends`
  - `class_name` references
- `project.godot`:
  - `application/run/main_scene`
  - `[autoload]`
- `.tscn` and `.tres` text resources:
  - `[ext_resource ... path="res://..."]`

## Edge semantics

- Scene and resource text references are emitted as normal `load` edges with `type: static`.
- `project.godot` resource-bearing settings are also emitted as normal static `load` edges.
- The finer-grained plugin provenance is `sourceId: "ext-resource"` for `.tscn`/`.tres` files and `sourceId: "project-settings"` for `project.godot`.
- The detector follows Godot's text-loader behavior more closely by accepting relative `path=` values and preferring a matching `uid=` target when one is known in the workspace.
- This means they participate in the existing `load` Edge Type Graph Scope settings while still being attributable to Godot text-resource parsing.

## Example workspace

The repo fixture at [`examples/example-godot`](https://github.com/joesobo/CodeGraphyV4/tree/main/examples/example-godot) now includes:

- `project.godot` → `scenes/main.tscn`, `scripts/game_manager.gd`
- `scripts/player.gd` → `scenes/ui/loadout_preview.tscn`, `resources/player_loadout.tres`
- `resources/player_loadout.tres` → `scripts/data/player_loadout.gd`, `textures/player_card.png`
- `scenes/ui/loadout_preview.tscn` → `resources/player_loadout.tres`, `scripts/ui/loadout_preview.gd`, `textures/player_card.png`

That example also now looks like a small real Godot project: it has a valid `project.godot`, a `main.tscn` entry scene, an autoloaded `GameManager`, and concrete player/enemy/UI scenes around the `.tscn`/`.tres` fixtures.

Those `.tscn`/`.tres` fixtures intentionally use relative `path=` values, and the scene's resource reference also carries a `uid=` so the plugin exercises both Godot-style resolution paths.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-godot)
