# Example Workspaces

Small repo fixtures for manual testing, screenshots, and extension-host e2e work. Each folder is a tiny recognizable project for its language, with just enough source and project metadata to make its CodeGraphy relationships obvious.

The nested `example-typescript/tsconfig.json` demonstrates TypeScript plugin
alias edges whether you open the full `examples/` workspace or the focused
`example-typescript/` workspace. The `example-javascript/jsconfig.json`
keeps JavaScript project metadata visible without asserting TypeScript-only
alias behavior.

- `example-typescript` — small TypeScript workspace used by extension e2e
- `example-javascript` — small JavaScript workspace mirroring the TypeScript graph story
- `example-vue` — Vue 3 SFC workspace used to inspect baseline `.vue` graph support
- `example-godot` — Godot/GDScript workspace used by plugin e2e
- `example-unity` — Unity project-file workspace for scene, prefab, GameObject, Component, and ScriptableObject asset reference support
- `example-python` — Python import-resolution workspace
- `example-csharp` — C# task dispatch workspace with type/member/variable coverage
- `example-markdown` — Markdown/wikilink workspace, including links inside non-markdown files
- `example-rust` — Rust module/use example with strong core Tree-sitter coverage
- `example-java` — Java import/inheritance example
- `example-go` — Go package/import example
- `example-c` — C tiny logger with include/call edges and C-native symbol nodes
- `example-cpp` — C++ task queue runner with namespace, alias, template, variable, include, call, inheritance, and override coverage
- `example-objective-c` — Objective-C dashboard/controller/store/view example
- `example-kotlin` — Kotlin import/inheritance example
- `example-scala` — Scala app/service/repository/view import and inheritance example
- `example-php` — PHP namespace/use/inheritance example
- `example-ruby` — Ruby require/inheritance example
- `example-pascal` — Pascal runner/repository/service/view unit uses and inheritance example
- `example-haskell` — Haskell module import example
- `example-lua` — Lua require example
- `example-swift` — Swift Package module import example
- `example-dart` — Dart relative/package import example
- `example-svelte` — Svelte component, type import, and lazy module import example
- `.codegraphy/snippets` — copyable CodeGraphy CSS Snippet examples for styling the extension UI
- `.codegraphy/particles` — custom particle effect examples for the Particles plugin

These examples are intentionally small. The goal is to keep the Relationship Graph predictable while still showing why symbol nodes are useful: files show the coarse architecture, then Symbol and Variable let you zoom into the declarations that explain why files are connected.

## CSS Snippet Examples

The `.codegraphy/snippets/` folder contains reference snippets for CodeGraphy CSS Snippets. List a snippet in that workspace's `.codegraphy/settings.json`:

```json
{
  "cssSnippets": {
    ".codegraphy/snippets/base-grid.css": true,
    ".codegraphy/snippets/forest.css": false,
    ".codegraphy/snippets/ocean-image.css": true
  }
}
```

Snippet paths are relative to the CodeGraphy Workspace and must stay inside it. Set a snippet to `true` to load it, `false` to keep it disabled, or omit it entirely. Absolute paths and `../` parent traversal are rejected with `[CodeGraphy]` developer-console warnings when enabled.

The demo snippets currently include:

- `base-grid.css` — a static black and grey grid background
- `forest.css` — static forest palette that themes graph UI panels, inputs, menus, and labels
- `ocean.css` — static ocean palette that themes graph UI panels, inputs, menus, and labels
- `ocean-image.css` — faded local ocean image behind the graph stage

## Symbol Node Stories

Open the repo-root `examples/` folder when you want to compare languages side by side, or open one example folder when you want a focused demo. In Graph Scope, enable **Symbol** first, then enable **Variable** when you want constants, properties, and variable-like plugin symbols. The parent toggles hide their child rows without erasing the child rows' saved state.

| Example | What To Look For With Symbol Enabled |
|---------|---------------------------------------|
| `example-typescript` | `src/index.ts` imports `buildGreeting`, type-imports `UserName`, and declares `currentUser`; `AppRunner` extends `BaseRunner` and implements `RunnableThing` for TypeScript inheritance coverage. |
| `example-javascript` | `src/index.js` imports `buildGreeting`, calls through `normalizeUserName`, and declares `currentUser`; `AppRunner` imports `RunnableThing` and extends `BaseRunner` for JavaScript import and inheritance coverage. |
| `example-vue` | A Vue 3 workspace with `<script setup lang="ts">`, normal `<script lang="ts">`, explicit `.vue` component imports, composables, type-only imports, interface inheritance, and a lazy async component import. |
| `example-godot` | A runnable Godot project with `project.godot`, scenes, resources, autoloads, and GDScript. `enemy.gd` extends a file-backed base entity while Godot `class_name` declarations appear under Variable. |
| `example-unity` | A playable Unity 2D sample with `ProjectSettings`, packages, an assembly definition, `SampleScene.unity`, player/bullet/enemy prefabs, enemy ScriptableObjects, `.meta` GUIDs, MonoBehaviour attachments, materials, input actions, and C# scripts. Unity plugin concept nodes should appear under the Unity Graph Scope row, while standard References edges connect scenes and prefabs to resolved scripts and prefab assets. |
| `example-python` | `main.py` imports config, service, and helper functions; `ApiUser` inherits from `BaseApiUser`, and member-import files show how imports and function symbols identify the exact code path. |
| `example-csharp` | `Program` wires a task dispatch app with `TaskDispatcher`, `PriorityTaskQueue`, records, a struct value object, a delegate event, enum status, properties, fields, parameters, constants, locals, inheritance, and interface implementation. |
| `example-markdown` | Markdown notes link to each other and to code, giving a mixed docs/code graph where symbol search still works on the TypeScript file. |
| `example-rust` | `main.rs` uses local modules and declares `App`, `Status`, and `Service`, showing module edges plus type/function symbols. |
| `example-java` | `App` imports `Helper`, extends `BaseService`, implements `RunnableThing`, and exposes class/interface/method symbols for import and inheritance checks. |
| `example-go` | `main.go` imports `internal/service`; package functions and the `Runner` type show how Go package edges connect to declarations. |
| `example-c` | `main.c` drives a tiny logger API; `logger.c`, `format.c`, and their headers show local includes, call-derived edges, and C include/function/prototype/struct/union/enum/typedef/global symbols from Core Tree-sitter analysis. |
| `example-cpp` | `app.cpp` wires a runnable task queue with `Task`, `TaskQueue`, `Worker`, `ConsoleWorker`, and `TaskRunner`; local includes, calls, inheritance, overrides, aliases, templates, and variable declarations give the C++ graph scope upgrade concrete targets. |
| `example-objective-c` | `main.m` launches an app delegate that wires a dashboard controller, session store, user model, and card view; `UserCardView` inherits from `AppView` and conforms to `ProfileRenderable`. |
| `example-kotlin` | `AppRunner` imports a model, extends a base class, and implements an interface, giving a compact import/inheritance/symbol demo. |
| `example-scala` | `AppRunner` composes a `UserService`, repository, model, and dashboard view while extending a base trait; class/object/trait/enum/type/function symbols show the Scala app path. |
| `example-php` | `Runner` imports a base class, interface, and model, then exposes class/function symbols for namespace-use checks. |
| `example-ruby` | `example_ruby.rb` requires the runner, and the runner inherits from `BaseRunner`, with module/class/method symbols for navigation. |
| `example-pascal` | `Main.pas` starts `SampleApp.pas`, which uses runner support, repository, pricing, receipt, and order model units; `TAppRunner` inherits from `TBaseRunner`. |
| `example-haskell` | `Main` imports a feature runner and model module; module/data/function symbols show the Haskell path through the graph. |
| `example-lua` | `main.lua` requires `app.runner`, which requires `app.model.user`; table/function symbols make the require chain less anonymous. |
| `example-swift` | A small Swift Package imports `RunnerSupport`; `Runner` inherits from `Worker` and conforms to `Runnable` to demonstrate class/protocol/function symbols. |
| `example-dart` | `sample_app.dart` imports a runner and profile; `Runner` extends `BaseRunner` with `Runnable`, while `User` and `Profile` keep the model side visible. |
| `example-svelte` | `App.svelte` uses module and instance scripts, type imports, interface inheritance, and a dynamic import to show Svelte plugin edges. |
