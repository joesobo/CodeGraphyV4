# CodeGraphy Godot

Adds Godot GDScript relationship analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-godot`](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- Core API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)
- Extension API: [`@codegraphy-dev/extension-plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/extension-plugin-api)

This package has two plugin entries. The Core entry analyzes Godot projects and
declares Godot graph semantics. The Extension entry owns Godot Graph View
colors, shapes, and icons. The CLI loads only the Core entry.

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
  - inline and standalone `@export` declarations as Exported Property Symbol Nodes
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
- The plugin emits GDScript `class_name` declarations as class symbols with `pluginKind: godot-class-name`. When Graph Scope enables Symbol, Variable, and `contains`, the Relationship Graph shows each declaration as a Symbol Node inside its `.gd` file. The Godot `class_name` row lives under Variable, so the parent toggle can hide these plugin-owned symbols without erasing their saved state.
- GDScript function, constant, variable, and enum declarations are emitted as normal Symbol Nodes, so they use the shared Function, Constant, Variable, and Enum Graph Scope and Legend defaults.
- Godot Scene, Resource, Autoload, Scene Node, Signal, and Exported Property rows are plugin-owned Symbol Node filters that still use the shared `contains` edge when ownership is visible.
- Signal `connect(...)` relationships are emitted as `codegraphy.gdscript:signal-connection` edges and appear under the Signal Connections Graph Scope row.
- Incremental indexing reanalyzes signal declaration files after a receiver adds, removes, or retargets a `connect(...)` call.
- The Godot Extension entry adds plugin-owned Legend rules so `class_name` and
  other Godot symbols can be styled separately from generic symbols.

## Example workspace

The repo fixture at [`examples/example-godot`](https://github.com/joesobo/CodeGraphyV4/tree/main/examples/example-godot) now includes:

- `project.godot` → `scenes/main.tscn`, `scripts/game_manager.gd`
- `scenes/main.tscn` → player, enemy, projectile, UI, and enemy spawner scene/script resources
- `scripts/player.gd` → `scripts/base/entity.gd`, `scenes/projectile.tscn`, `scripts/projectile.gd`, and `scripts/components/health_component.gd`
- `scripts/spawning/enemy_spawner.gd` → `scenes/enemy.tscn`, `resources/enemy_spawn_config.tres`, `scripts/enemy.gd`, `scripts/player.gd`, and `scripts/data/spawn_config.gd`
- `resources/enemy_spawn_config.tres` → `scripts/data/spawn_config.gd`

The example has the structure of a small Godot project. It includes a valid `project.godot`, a `main.tscn` entry scene, and an autoloaded `GameManager`. Player, enemy, and projectile scenes include colliders and health bars. A compact controls UI and enemy spawner complete the fixture.

Those `.tscn`/`.tres` fixtures intentionally use relative `path=` values, and the resource reference also carries a `uid=` so the plugin exercises both Godot-style resolution paths.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-godot)
