# Host-neutral plugin activation and interface ownership

**Status:** Accepted

CodeGraphy uses one installation and activation system for all plugins. Each
runtime host owns its own plugin API and decides how to use Core data.

**Considered Options**

- Put analysis, rendering, webview, and editor hooks in one Plugin API. This
  gives every plugin one large contract, but it makes Core depend on interface
  details that a CLI, webview, or future host does not need.
- Give each interface a separate installation and enablement system. This keeps
  host contracts small, but users must install and manage the same package more
  than once.
- Use one host-neutral package registry and activation model, then let each host
  load only the descriptors that it understands. This keeps one user workflow
  without making Core understand interface behavior.

**Decision**

A plugin package declares one or more descriptors in
`package.json#codegraphy.plugins`. Each descriptor has an ID, host, entry file,
and API version. The host is an open string. Core does not keep a fixed list of
valid interface hosts.

For example, one package can contain these two descriptors:

```json
{
  "codegraphy": {
    "plugins": [
      {
        "id": "acme.language",
        "host": "core",
        "entry": "./dist/core.js",
        "apiVersion": "^4.0.0"
      },
      {
        "id": "acme.language-view",
        "host": "codegraphy.extension",
        "entry": "./dist/extension.js",
        "apiVersion": "^1.0.0"
      }
    ]
  }
}
```

Registering the package installs every descriptor in the user registry at
`~/.codegraphy/plugins.json`. Registration does not make a plugin run.

Each installed descriptor has a global enabled value. A workspace can set its
activation to `inherit`, `enabled`, or `disabled`. `inherit` uses the global
value. An explicit workspace value wins over the global value.

Core resolves installation and activation for every descriptor. Core imports
only descriptors whose host is `core`. An interface asks for active descriptors
for its own host and imports those descriptors itself. An active descriptor is
dormant until its host opens it. For example, an enabled particles plugin does
nothing during a CLI query. The VS Code extension loads it when the Extension
host starts.

`@codegraphy-dev/plugin-api` is the Core Plugin API. It contains headless
analysis, semantic graph, persistence, and lifecycle contracts. It does not
contain colors, shapes, rendering, webviews, editor actions, or Graph View
contracts.

`@codegraphy-dev/extension-plugin-api` is the VS Code Extension Plugin API. It
owns Extension lifecycle and webview contracts. The particles plugin uses this
API.

Core graph records contain semantic data only. Interfaces choose colors,
positions, physics, and rendering. Core does not persist view state.
This supersedes the `NodeView` persistence decision in ADR 0002. The SQLite
Graph Cache keeps semantic facts only.

Workspace settings provide an open interface data list:

```json
{
  "interfaces": [
    {
      "id": "codegraphy.extension",
      "data": {
        "pinnedNodes": [
          { "id": "src/app.ts", "x": 120, "y": 80 }
        ]
      }
    }
  ]
}
```

Core preserves this list without defining interface IDs or data keys. An
interface should persist only user intent that must survive a restart. A pinned
position is useful user intent. A temporary physics position or derived color
usually is not.

**Consequences**

- Users get one plugin registry and one activation model.
- A CLI, VS Code extension, future webview, MCP server, or third-party interface
  can add a host without changing Core's host list.
- Enabling a plugin does not run code until the matching host loads it.
- Core stays headless and does not carry rendering fields or persisted view
  state.
- Host-specific metadata and runtime validation belong to the matching host.
- A package can support more than one host without merging their APIs.
