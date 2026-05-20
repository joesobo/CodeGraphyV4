# Private Feature Plugin Boundary

The public monorepo keeps generalized plugin infrastructure:

- package plugin discovery, install, enable, disable, and asset loading
- plugin-owned data host APIs
- Graph View runtime node, runtime edge, projection, force, context menu, UI, and toolbar contribution plumbing
- generic webview-to-plugin messaging

Private feature packages own feature-specific behavior:

- feature-specific runtime nodes, ownership models, and graph layout data
- feature-specific context menu actions
- plugin-owned persistence and mutations
- feature-specific Graph View projection, physics, exports, and webview assets

Current removal checklist:

- [x] Remove public toolbar feature-specific creation entries.
- [x] Remove public built-in feature-specific context menu actions.
- [x] Remove public webview feature-specific runtime/projection synthesis.
- [x] Remove public feature-specific UI and physics modules.
- [x] Remove public feature-specific settings, protocol messages, and extension dispatch.
- [x] Keep public Graph View plugin APIs generic enough for private and community plugins.
- [ ] Prove a linked private package contributes runtime nodes, actions, and physics only while enabled.
