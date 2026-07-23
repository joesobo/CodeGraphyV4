# @codegraphy-dev/plugin-unity

## 0.2.6

### Patch Changes

- [#317](https://github.com/joesobo/CodeGraphyV4/pull/317) [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa) Thanks [@joesobo](https://github.com/joesobo)! - Use one global and workspace plugin activation model for every runtime host.
  Keep Core plugins headless, move VS Code Extension contracts to the Extension
  Plugin API, and load active host-specific plugins only when that host opens.

  Remove rendering fields and persisted view state from Core graph data. Let each
  interface own its rendering and preserve optional interface data through the
  open workspace `interfaces` list.

  Ship Godot and Unity as dual-host packages. Their Core entries own analysis and
  semantic graph types. Their Extension entries own Graph View Legend colors,
  shapes, and icons.

- Updated dependencies [[`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa)]:
  - @codegraphy-dev/extension-plugin-api@1.1.0
  - @codegraphy-dev/plugin-api@7.0.0

## 0.2.5

### Patch Changes

- Updated dependencies [[`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962)]:
  - @codegraphy-dev/plugin-api@6.1.0

## 0.2.4

### Patch Changes

- Declare compatibility with the new CodeGraphy Plugin API 3 runtime contract.

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now provides one supported 2D Relationship Graph and removes the 3D graph mode, its toolbar toggle, 3D node shapes, 3D camera state, and Three.js renderer settings. Existing workspaces open directly in the 2D graph; saved 3D preferences are ignored.

This is a breaking Plugin API change. Plugin authors must remove `GraphNodeShape3D`, `shape3D`, `graphMode`, three-dimensional node coordinates (`z`, `fz`, and `vz`), and 3D values in selected-node position payloads. Graph View contributions, drag callbacks, context-menu selectors, and viewport adapters now receive only two-dimensional graph state. The Unity plugin continues to contribute Unity graph data but no longer supplies 3D presentation metadata.

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0

## 0.2.3

### Patch Changes

- [#300](https://github.com/joesobo/CodeGraphyV4/pull/300) [`e3e7e61`](https://github.com/joesobo/CodeGraphyV4/commit/e3e7e6166fce6d72b2117a36a9eb1510562fb6b7) Thanks [@joesobo](https://github.com/joesobo)! - Ship Unity plugin icon and file shape defaults so Unity project files render with plugin-provided graph icons.

## 0.2.2

### Patch Changes

- [#299](https://github.com/joesobo/CodeGraphyV4/pull/299) [`2cdffa6`](https://github.com/joesobo/CodeGraphyV4/commit/2cdffa62eef0e569d66c4186ced1b010d756d1a7) Thanks [@joesobo](https://github.com/joesobo)! - Package built-in Unity plugin icon assets for Theme Legend rows and graph Nodes. Use a white Material Icon Theme Unity glyph for Unity defaults and a triangle for `.asset` defaults. Show a defined fallback when an icon preview cannot load.

## 0.2.1

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now loads plugin-owned and Symbol evidence into memory when the user enables the matching Graph Scope or plugin. If Graph Cache contains the evidence, the first toggle uses 1 cache read, 0 analysis jobs, and 0 cache saves. Later off/on toggles reuse memory without more cache reads.

In the current `main` versus PR monorepo benchmark, the change reduced baseline serialized runtime cache size from 18,583,676 bytes to 10,781,465 bytes. The result uses 7,802,211 fewer bytes, a 41.98% reduction, and is 1.72 times smaller. It also keeps retained Symbol facts at 0 until the user enables Symbol scope; the previous startup retained 11,631 hidden facts.

Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 0.2.0

### Minor Changes

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6) Thanks [@joesobo](https://github.com/joesobo)! - Add a reusable Events edge type and emit Unity persistent-call event edges from serialized scenes and prefabs.

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`3924f42`](https://github.com/joesobo/CodeGraphyV4/commit/3924f4210b1915dea5c203d4d07bb4d0e485e41b) Thanks [@joesobo](https://github.com/joesobo)! - Add initial Unity plugin support for scenes and prefabs. The plugin creates GameObject and Component graph Symbols with Unity Graph Scope defaults and file-to-GameObject-to-Component containment. It also adds icon-backed Unity file themes, default filters for generated files, and Unity-sourced reference Edges for scripts and prefab instances.

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 0.1.0

### Minor Changes

- Add the initial Unity plugin with serialized YAML parsing, Unity Graph Scope rows, default Unity project filters, icon-backed Unity file theming, visible Unity reference edges, and MonoBehaviour script GUID resolution.
