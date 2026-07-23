# @codegraphy-dev/extension-plugin-api

## 1.1.0

### Minor Changes

- [#317](https://github.com/joesobo/CodeGraphyV4/pull/317) [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa) Thanks [@joesobo](https://github.com/joesobo)! - Use one global and workspace plugin activation model for every runtime host.
  Keep Core plugins headless, move VS Code Extension contracts to the Extension
  Plugin API, and load active host-specific plugins only when that host opens.

  Remove rendering fields and persisted view state from Core graph data. Let each
  interface own its rendering and preserve optional interface data through the
  open workspace `interfaces` list.

  Ship Godot and Unity as dual-host packages. Their Core entries own analysis and
  semantic graph types. Their Extension entries own Graph View Legend colors,
  shapes, and icons.

### Patch Changes

- Updated dependencies [[`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa)]:
  - @codegraphy-dev/plugin-api@7.0.0
