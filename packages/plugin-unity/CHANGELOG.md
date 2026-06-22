# @codegraphy-dev/plugin-unity

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
