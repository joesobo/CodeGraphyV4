# @codegraphy-dev/plugin-unity

## 0.2.3

### Patch Changes

- [#300](https://github.com/joesobo/CodeGraphyV4/pull/300) [`e3e7e61`](https://github.com/joesobo/CodeGraphyV4/commit/e3e7e6166fce6d72b2117a36a9eb1510562fb6b7) Thanks [@joesobo](https://github.com/joesobo)! - Ship Unity plugin icon and file shape defaults so Unity project files render with plugin-provided graph icons.

## 0.2.2

### Patch Changes

- [#299](https://github.com/joesobo/CodeGraphyV4/pull/299) [`2cdffa6`](https://github.com/joesobo/CodeGraphyV4/commit/2cdffa62eef0e569d66c4186ced1b010d756d1a7) Thanks [@joesobo](https://github.com/joesobo)! - Package built-in Unity plugin icon assets so theme legend rows and graph nodes can load their configured icons, use a white Material Icon Theme Unity glyph for Unity defaults, render `.asset` defaults with a triangle shape, and show an intentional fallback when an icon preview cannot load.

## 0.2.1

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

  On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

  Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 0.2.0

### Minor Changes

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6) Thanks [@joesobo](https://github.com/joesobo)! - Add a reusable Events edge type and emit Unity persistent-call event edges from serialized scenes and prefabs.

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`3924f42`](https://github.com/joesobo/CodeGraphyV4/commit/3924f4210b1915dea5c203d4d07bb4d0e485e41b) Thanks [@joesobo](https://github.com/joesobo)! - Add initial Unity plugin support for parsing scenes and prefabs into GameObject and Component graph symbols with Unity Graph Scope defaults, file-to-GameObject-to-Component containment, icon-backed Unity file theming, default Unity generated-file filters, and Unity-sourced reference edges for scripts and prefab instances.

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 0.1.0

### Minor Changes

- Add the initial Unity plugin with serialized YAML parsing, Unity Graph Scope rows, default Unity project filters, icon-backed Unity file theming, visible Unity reference edges, and MonoBehaviour script GUID resolution.
