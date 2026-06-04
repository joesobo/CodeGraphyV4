# Example Workspaces

Small repo fixtures for manual testing, screenshots, and extension-host e2e work. Each folder is a tiny recognizable project for its language, with just enough source and project metadata to make its CodeGraphy relationships obvious.

The nested `example-typescript/tsconfig.json` demonstrates TypeScript plugin
alias edges whether you open the full `examples/` workspace or the focused
`example-typescript/` workspace.

- `example-typescript` — small TypeScript workspace used by extension e2e
- `vue-example` — Vue 3 SFC workspace used to inspect baseline `.vue` graph support
- `example-godot` — Godot/GDScript workspace used by plugin e2e
- `example-python` — Python import-resolution workspace
- `example-csharp` — C# namespace and type-usage workspace
- `example-markdown` — Markdown/wikilink workspace, including links inside non-markdown files
- `example-rust` — Rust module/use example with strong core Tree-sitter coverage
- `example-java` — Java import/inheritance example
- `example-go` — Go package/import example
- `example-c` — C include example
- `example-cpp` — C++ include example
- `example-objective-c` — Objective-C import/interface example
- `example-kotlin` — Kotlin import/inheritance example
- `example-scala` — Scala import/inheritance example
- `example-php` — PHP namespace/use/inheritance example
- `example-ruby` — Ruby require/inheritance example
- `example-pascal` — Pascal unit uses/inheritance example
- `example-haskell` — Haskell module import example
- `example-lua` — Lua require example
- `example-swift` — Swift Package module import example
- `example-dart` — Dart relative/package import example
- `example-svelte` — Svelte component script import example

These examples are intentionally small. The goal is to keep the Relationship Graph predictable while still showing why symbol nodes are useful: files show the coarse architecture, then Symbol and Variable let you zoom into the declarations that explain why files are connected.

## Symbol Node Stories

Open the repo-root `examples/` folder when you want to compare languages side by side, or open one example folder when you want a focused demo. In Graph Scope, enable **Symbol** first, then enable **Variable** when you want constants, properties, and variable-like plugin symbols. The parent toggles hide their child rows without erasing the child rows' saved state.

| Example | What To Look For With Symbol Enabled |
|---------|---------------------------------------|
| `example-typescript` | `src/index.ts` imports `buildGreeting`, type-imports `UserName`, and declares `currentUser` as a Variable node so the file graph becomes a small call/type/value story. |
| `vue-example` | A Vue 3 workspace with `<script setup lang="ts">`, normal `<script lang="ts">`, explicit `.vue` imports, extensionless component imports, composables, and type-only imports. Before the Vue plugin exists, use it to inspect which `.vue` nodes and connections are missing from the baseline graph. |
| `example-godot` | A runnable Godot project with `project.godot`, scenes, resources, autoloads, and GDScript. Godot `class_name` declarations appear under Variable, so toggling Variable hides `Player`, `Enemy`, `PlayerLoadout`, `LoadoutPreview`, and other plugin-owned class-name symbols while preserving their own on/off state. |
| `example-python` | `main.py` imports config, service, and helper functions; member-import files show how imports and function symbols identify the exact code path. |
| `example-csharp` | `Program` calls into `Config`, `ApiService`, and `Helpers`, while classes and methods make the namespace relationships easier to scan. |
| `example-markdown` | Markdown notes link to each other and to code, giving a mixed docs/code graph where symbol search still works on the TypeScript file. |
| `example-rust` | `main.rs` uses local modules and declares `App`, `Status`, and `Service`, showing module edges plus type/function symbols. |
| `example-java` | `App` imports `Helper`, extends `BaseService`, and exposes class/method symbols for import and inheritance checks. |
| `example-go` | `main.go` imports `internal/service`; package functions and the `Runner` type show how Go package edges connect to declarations. |
| `example-c` | `main.c` and `math/add.c` include `add.h`; function and struct symbols make the tiny C dependency chain inspectable. |
| `example-cpp` | `app.cpp` and `widget.cpp` include `widget.hpp`; class, method, and function symbols show both declaration and implementation files. |
| `example-objective-c` | `AppDelegate.m` imports `UserCard.h`; interface and method symbols make the small Cocoa-style chain inspectable. |
| `example-kotlin` | `AppRunner` imports a model, extends a base class, and implements an interface, giving a compact import/inheritance/symbol demo. |
| `example-scala` | `AppRunner` imports a base trait and model, extends the trait, and exposes class/object/enum/type/function symbols. |
| `example-php` | `Runner` imports a base class, interface, and model, then exposes class/function symbols for namespace-use checks. |
| `example-ruby` | `example_ruby.rb` requires the runner, and the runner inherits from `BaseRunner`, with module/class/method symbols for navigation. |
| `example-pascal` | `SampleApp.pas` uses `RunnerSupport.pas`; class and procedure symbols show baseline unit relationships. |
| `example-haskell` | `Main` imports a feature runner and model module; module/data/function symbols show the Haskell path through the graph. |
| `example-lua` | `main.lua` requires `app.runner`, which requires `app.model.user`; table/function symbols make the require chain less anonymous. |
| `example-swift` | A small Swift Package imports `RunnerSupport`; `Runner`, `Worker`, and `Runnable` demonstrate class/protocol/function symbols. |
| `example-dart` | `sample_app.dart` imports a runner and profile; `Runner`, `BaseRunner`, `Runnable`, `User`, and `Profile` demonstrate class/mixin/function symbols. |
| `example-svelte` | `App.svelte` uses module and instance scripts, type imports, and a dynamic import to show Svelte plugin edges. |
