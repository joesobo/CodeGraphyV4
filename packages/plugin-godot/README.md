# CodeGraphy Godot

Adds Godot GDScript relationship analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-godot`](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-godot
codegraphy plugins register @codegraphy-dev/plugin-godot
codegraphy plugins enable @codegraphy-dev/plugin-godot
codegraphy index
```

## Detection coverage

- `.gd` files:
  - `preload()`
  - `load()`
  - `extends`
  - `class_name` references
  - `class_name` declarations as Symbol Nodes
  - function, constant, variable, and enum declarations as Symbol Nodes
  - `signal` declarations as Symbol Nodes
  - `@export var` declarations as Exported Property Symbol Nodes
  - `connect(...)` calls as Signal Connections
- Structured parsing:
  - `@gdquest/lezer-gdscript` parses GDScript before `preload()`, `load()`, `ResourceLoader.load()`, and `class_name` extraction, with text fallbacks for parser gaps.
  - `@fernforestgames/godot-resource-parser` parses Godot 4 `.tscn` and `.tres` files before external-resource dependency extraction, with text fallbacks for unsupported syntax.
  - `project.godot` sections use the plugin's lightweight text parser for resource-bearing settings.
- `project.godot`:
  - `application/run/main_scene`
  - `[autoload]`
- `.tscn` and `.tres` text resources:
  - `[ext_resource ... path="res://..."]`
  - scene and resource headers as Scene or Resource Symbol Nodes
  - scene node entries as Scene Node Symbol Nodes

## Edge semantics

- Scene and resource text references are emitted as normal `load` edges with `type: static`.
- `project.godot` resource-bearing settings are also emitted as normal static `load` edges.
- The finer-grained plugin provenance is `sourceId: "ext-resource"` for `.tscn`/`.tres` files and `sourceId: "project-settings"` for `project.godot`.
- The detector follows Godot's text-loader behavior more closely by accepting relative `path=` values and preferring a matching `uid=` target when one is known in the workspace.
- This means they participate in the existing `load` Edge Type Graph Scope settings while still being attributable to Godot text-resource parsing.
- GDScript `class_name` declarations are emitted as class symbols with `pluginKind: godot-class-name`. When Symbol, Variable, and `contains` are enabled in Graph Scope, the Relationship Graph shows the declaration as a Symbol Node contained by its `.gd` file. The Godot `class_name` Graph Scope row lives under Variable so the Variable parent toggle can hide these plugin-owned declaration symbols without erasing their own saved state.
- GDScript function, constant, variable, and enum declarations are emitted as normal Symbol Nodes, so they use the shared Function, Constant, Variable, and Enum Graph Scope and Legend defaults.
- Godot Scene, Resource, Autoload, Scene Node, Signal, and Exported Property rows are plugin-owned Symbol Node filters that still use the shared `contains` edge when ownership is visible.
- Signal `connect(...)` relationships are emitted as `codegraphy.gdscript:signal-connection` edges and appear under the Signal Connections Graph Scope row.
- The Legend includes `Plugins` / `Godot` / `class_name` so these symbols can be styled separately from generic class symbols.

## Example workspace

The repo fixture at [`examples/example-godot`](https://github.com/joesobo/CodeGraphyV4/tree/main/examples/example-godot) now includes:

- `project.godot` → `scenes/main.tscn`, `scripts/game_manager.gd`
- `scenes/main.tscn` → player, enemy, projectile, UI, and enemy spawner scene/script resources
- `scripts/player.gd` → `scripts/base/entity.gd`, `scenes/projectile.tscn`, `scripts/projectile.gd`, and `scripts/components/health_component.gd`
- `scripts/spawning/enemy_spawner.gd` → `scenes/enemy.tscn`, `resources/enemy_spawn_config.tres`, `scripts/enemy.gd`, `scripts/player.gd`, and `scripts/data/spawn_config.gd`
- `resources/enemy_spawn_config.tres` → `scripts/data/spawn_config.gd`

That example also now looks like a small real Godot project: it has a valid `project.godot`, a `main.tscn` entry scene, an autoloaded `GameManager`, player/enemy/projectile scenes with colliders and health bars, a compact controls UI, and an enemy spawner that continuously creates enemies.

Those `.tscn`/`.tres` fixtures intentionally use relative `path=` values, and the resource reference also carries a `uid=` so the plugin exercises both Godot-style resolution paths.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-godot)
