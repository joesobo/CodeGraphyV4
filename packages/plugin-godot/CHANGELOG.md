# @codegraphy-dev/plugin-godot

## 2.2.0

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

  Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

- [#204](https://github.com/joesobo/CodeGraphyV4/pull/204) [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4) Thanks [@joesobo](https://github.com/joesobo)! - Add Symbol and Variable nodes to the Relationship Graph with Graph Scope controls, `contains` and `overrides` edges, scoped Legend defaults, symbol-aware exports, and richer Graph Query/MCP symbol payloads.

  Default node Legend entries now use singular labels, keep their colors directly editable, and rely on Custom Legend Entries for overrides instead of separate color-enable toggles. Core symbol defaults stay intentionally broad; language-specific symbol kinds fall back to Symbol styling unless a plugin contributes its own defaults. The plugin API now documents symbol endpoint projection for `fromSymbolId` and `toSymbolId`, and the Godot plugin emits `class_name`, function, constant, variable, and enum declarations as symbol nodes. Symbol hover cards now show the symbol name, containing file, symbol type, and graph connection counts directly from the visible graph.

### Patch Changes

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/plugin-api@3.0.0

## 2.1.2

### Patch Changes

- Updated dependencies [[`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1)]:
  - @codegraphy-dev/plugin-api@2.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [[`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f)]:
  - @codegraphy-dev/plugin-api@1.2.0

## 2.1.0

### Minor Changes

- [#183](https://github.com/joesobo/CodeGraphyV4/pull/183) [`8ce9a34`](https://github.com/joesobo/CodeGraphyV4/commit/8ce9a34ced0bedf5363cdc7a33a8da96424ca7fb) Thanks [@joesobo](https://github.com/joesobo)! - Analyze `.tscn` and `.tres` Godot text-resource files and add graph connections for their external resource references.

## 2.0.1

### Patch Changes

- Updated dependencies [[`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83)]:
  - @codegraphy-dev/plugin-api@1.1.0

## 2.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

### Patch Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`0334085`](https://github.com/joesobo/CodeGraphyV4/commit/03340858e4365b953053b44493172cddb635fbf9) Thanks [@joesobo](https://github.com/joesobo)! - Fix nested example workspace indexing so Python, Go, Java, Rust, and Godot file connections resolve when opening the repo-level `examples` folder.

- Updated dependencies [[`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955), [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20), [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c)]:
  - @codegraphy-dev/plugin-api@1.0.0

## 1.0.1

### Patch Changes

- Fix companion extension activation so the core graph refreshes when language plugins register and their connections appear reliably.

- Refresh the published extension and plugin package listings with updated README links, package icons, and marketplace metadata.

- Updated dependencies []:
  - @codegraphy-dev/plugin-api@0.1.1
