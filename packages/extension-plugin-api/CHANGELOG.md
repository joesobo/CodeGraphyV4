# @codegraphy-dev/extension-plugin-api

## 3.0.0

### Major Changes

- [#341](https://github.com/joesobo/CodeGraphyV4/pull/341) [`8a6530e`](https://github.com/joesobo/CodeGraphyV4/commit/8a6530ee6c96f21e69458bc18bc18bcf2aad7c44) Thanks [@joesobo](https://github.com/joesobo)! - Extension Plugin API 2 replaces `graph.panelSlot` and the declarative panel view with `registerPanelContribution`. Plugin panels now register closed, share one exclusive region with built-in panels, and return a handle that can reopen the same panel. Update Extension plugin descriptors to require `apiVersion: "^2.0.0"`. Plugins can use `onEscape` to close one nested layer before the host closes the panel.

## 2.0.0

### Major Changes

- [#326](https://github.com/joesobo/CodeGraphyV4/pull/326) [`c468e11`](https://github.com/joesobo/CodeGraphyV4/commit/c468e117a06f66ae801edef867823ac9b92d005a) Thanks [@joesobo](https://github.com/joesobo)! - Node.js 20 is no longer supported. Upgrade to Node.js `^22.14.0 || >=23.6.0` before
  updating CodeGraphy Core, interfaces, APIs, or plugins. Newer Node.js releases
  remain supported because these packages do not set a maximum version.

  The VS Code extension now requires VS Code 1.101 or newer. Extension users do
  not need to install Node.js separately because VS Code supplies the Extension
  host runtime.

### Patch Changes

- Updated dependencies [[`c468e11`](https://github.com/joesobo/CodeGraphyV4/commit/c468e117a06f66ae801edef867823ac9b92d005a), [`bb228f1`](https://github.com/joesobo/CodeGraphyV4/commit/bb228f1115c76804330c58e7ab4f9ca18a983faa)]:
  - @codegraphy-dev/plugin-api@8.0.0

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
