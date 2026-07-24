# Settings

CodeGraphy stores workspace behavior in `.codegraphy/settings.json`. The extension creates the file, watches it, and writes controls back to it. You can edit valid JSON by hand; CodeGraphy ignores an invalid save until you fix it.

Display and projection changes update the current Graph View from runtime memory. Discovery or analyzer-plugin changes can schedule graph work. Re-index remains the explicit full refresh path.

## Settings File

```text
<workspace-root>/.codegraphy/settings.json
```

A small hand-written file can override only the values you care about:

```json
{
  "version": 4,
  "maxFiles": 2000,
  "filterPatterns": ["**/generated/**", "**/*.snap"],
  "plugins": [
    { "id": "codegraphy.markdown", "activation": "enabled" },
    { "id": "codegraphy.vue", "activation": "inherit" }
  ],
  "interfaces": [
    {
      "id": "codegraphy.extension",
      "data": {
        "showOrphans": false,
        "favorites": [],
        "directionMode": "arrows",
        "pinnedNodes": [],
        "showMinimap": true,
        "cssSnippets": {
          ".codegraphy/snippets/team.css": true
        }
      }
    }
  ]
}
```

The extension normalizes missing values against current defaults and preserves recognized extension-owned fields when the Core CLI updates Graph Scope, filters, or plugins.

## Reference

| Key | Type | Default | Purpose |
|---|---|---|---|
| `version` | number | `4` | Persisted extension settings schema. |
| `maxFiles` | number | `1000` | Maximum currently eligible files indexed. |
| `include` | string[] | `["**/*"]` | Workspace-relative discovery globs. |
| `respectGitignore` | boolean | `true` | Exclude paths Git reports as ignored. |
| `filterPatterns` | string[] | `[]` | Enabled custom exclusion patterns. |
| `disabledCustomFilterPatterns` | string[] | `[]` | Custom filter patterns retained in a disabled state. |
| `disabledPluginFilterPatterns` | string[] | `[]` | Disabled source-owned plugin filter patterns. |
| `interfaces[].data.showOrphans` | boolean | `true` | Keep Nodes with no remaining Edges in the Visible Graph. |
| `interfaces[].data.showLabels` | boolean | `true` | Draw Node labels. |
| `interfaces[].data.showMinimap` | boolean | `true` | Show the interactive graph minimap. |
| `interfaces[].data.showFps` | boolean | `false` | Show rendered FPS and simulation/render CPU time. |
| `verboseDiagnostics` | boolean | `false` | Emit extension support diagnostics. |
| `nodeVisibility` | object | generated | Graph Scope intent by Node Type ID. |
| `edgeVisibility` | object | generated | Graph Scope intent by Edge Type ID. |
| `interfaces[].data.nodeColors` | object | generated | Extension Node Type colors. |
| `interfaces[].data.legend` | object[] | `[]` | Custom Legend Entries. |
| `interfaces[].data.legendVisibility` | object | `{}` | Enabled state for source-owned Legend entries and groups. |
| `interfaces[].data.legendOrder` | string[] | `[]` | Custom Legend priority order. |
| `interfaces[].data.favorites` | string[] | `[]` | Extension favorite Node paths. |
| `interfaces[].data.bidirectionalEdges` | string | `"separate"` | Draw mutual Edges separately or combined. |
| `interfaces[].data.directionMode` | string | `"arrows"` | Use arrows, particles, or no direction indicator. |
| `interfaces[].data.directionColor` | string | `"#475569"` | Direction indicator color. |
| `interfaces[].data.particleSpeed` | number | `0.005` | Direction-particle speed. |
| `interfaces[].data.particleSize` | number | `4` | Direction-particle size in pixels. |
| `interfaces[].data.depthMode` | boolean | `false` | Focus around the selected Node by Edge depth. |
| `interfaces[].data.depthLimit` | number | `1` | Depth Mode hop limit, clamped from 1 to 10 and to reachable graph depth. |
| `interfaces[].data.nodeSizeMode` | string | `"connections"` | Size Nodes by Connections or File Size. |
| `interfaces[].data.physics` | object | see below | WebAssembly force settings. |
| `interfaces[].data.cssSnippets` | object | `{}` | Workspace-relative CSS paths mapped to enabled booleans. |
| `plugins` | object[] | Markdown enabled | Workspace Plugin ID activity and options. |
| `pluginData` | object | `{}` | Plugin-owned persisted data keyed by Plugin ID. |
| `interfaces` | object[] | Extension defaults | Open interface-owned `{ id, data }` entries. |

Edge colors come from Edge Type definitions and Legend layers. There is no current `edgeColors` settings map.

### Physics

```json
{
  "interfaces": [{
    "id": "codegraphy.extension",
    "data": {
      "physics": {
        "repelForce": 10,
        "linkDistance": 80,
        "linkForce": 1,
        "damping": 0.4,
        "centerForce": 0.1
      }
    }
  }]
}
```

The Settings > Forces controls apply these values to the live WebAssembly layout.

## Discovery and Filters

`include` limits File Discovery before analysis:

```json
{
  "include": ["packages/core/src/**/*", "packages/extension/src/**/*"]
}
```

`filterPatterns` removes recurring noise after Graph Scope. During Indexing, active custom and plugin Filters also keep matching files out of fresh analysis and the `maxFiles` budget. Analysis cached while a Filter was disabled remains reusable when that Filter is enabled again. Patterns support basename matching, so `*.png` matches at any depth.

```json
{
  "filterPatterns": ["*.png", "**/*.snap", "vendor/**"]
}
```

Core also excludes common generated directories and artifacts such as `node_modules`, `dist`, `build`, `.git`, coverage output, minified JavaScript, and bundles. When `respectGitignore` is true, Git-ignored paths do not enter fresh analysis or consume `maxFiles`. Existing cached analysis for those paths remains available if Git ignored handling is later disabled.

CodeGraphy normalizes an empty `include` to `["**/*"]` and removes duplicate filters.

## Graph Scope and Legend

Graph Scope writes Node Type intent to `nodeVisibility` and Edge Type intent to `edgeVisibility`. These maps retain saved values when a language or plugin capability disappears, so the value returns if that capability becomes relevant again.

Before Indexing, Node Types show structural File, Folder, and Package controls. Symbol, Variable, language, and plugin child rows appear from indexed capability declarations. Edge Type controls become available after a Graph Cache exists.

Legend styling resolves in this order:

1. Extension defaults
2. Extension plugin defaults
3. Custom Legend Entries

Turning off a Legend Entry disables its styling. It does not hide matching Nodes or Edges. Custom entries can match file paths, symbol names, symbol kinds, plugin kinds, languages, and containing file paths.

```json
{
  "legend": [
    { "id": "features", "pattern": "src/features/**", "color": "#3B82F6" },
    { "id": "tests", "pattern": "**/*.test.*", "color": "#10B981" }
  ]
}
```

Use Graph Scope for visibility and Themes for styling.

## Plugins

Installing or registering a package does not run it. The `plugins` array stores workspace activation overrides:

```json
{
  "plugins": [
    { "id": "codegraphy.markdown", "activation": "enabled" },
    {
      "id": "codegraphy.gdscript",
      "activation": "inherit",
      "options": {
        "includeSceneResources": true
      }
    }
  ]
}
```

`inherit` uses the global activation value. `enabled` and `disabled` override it for the current workspace. The Markdown plugin starts enabled in new workspaces. Other registered plugins start disabled. Core merges package defaults with workspace `options`, with workspace values winning.

Plugins store their own state under `pluginData[pluginId]`. Plugin Data does not control plugin enablement.

Interfaces store their own state in the open `interfaces` list. The VS Code
Extension stores its display, theme, favorite, depth, size, and physics choices
in the `codegraphy.extension` entry. Core preserves the interface ID and data
without defining its keys. Store durable user intent, such as pinned Node
positions. Do not store temporary physics positions.

See the [Plugin Guide](./PLUGINS.md) for installation, registration, and package metadata.

## CSS Snippets

CSS Snippets style stable CodeGraphy webview surfaces without rebuilding a VS Code theme.

```json
{
  "interfaces": [{
    "id": "codegraphy.extension",
    "data": {
      "cssSnippets": {
        ".codegraphy/snippets/team.css": true,
        ".codegraphy/snippets/experiment.css": false
      }
    }
  }]
}
```

Snippet paths:

- are relative to the workspace root
- must end in `.css`
- must stay inside the workspace
- load in object insertion order

CodeGraphy rejects absolute paths and parent traversal. It warns about invalid or missing enabled snippets in VS Code Developer Tools. Changing the settings map reloads the enabled list. Editing the contents of an already loaded CSS file requires a webview reload or another settings change.

Target stable `data-codegraphy-*` hooks rather than generated classes. Common hook categories include `data-codegraphy-surface`, `data-codegraphy-region`, `data-codegraphy-panel`, `data-codegraphy-control`, `data-codegraphy-section`, `data-codegraphy-slot`, `data-codegraphy-state`, and `data-codegraphy-row`.

```css
[data-codegraphy-surface='graph-stage'] {
  background: #101412;
}

[data-codegraphy-panel='graph-scope'] {
  color: var(--vscode-foreground);
}
```

WebGPU graph Nodes are GPU instances rather than DOM elements. CSS selectors cannot target individual Nodes. Plugins use Node and Edge decoration contributions for per-item styling.

Copyable snippets live under `examples/.codegraphy/snippets/`.

## Settings Panel

The left rail opens four Settings sections:

- **Display**: direction mode, bidirectional Edges, Depth Mode, Show Orphans, direction particles, labels, and minimap.
- **Forces**: repel, center, link distance, link force, and damping.
- **Performance**: Max Files, Verbose Diagnostics, and Show FPS.
- **Export**: image, graph data, symbol data, and plugin exports.

Graph Scope and Themes have separate panels because they control graph eligibility and semantic styling rather than general display preferences.

## Repository State

Generated and user-level data use separate locations:

- `.codegraphy/settings.json`: workspace settings; teams may commit this file.
- `.codegraphy/graph.sqlite`: generated Graph Cache; keep it local.
- `~/.codegraphy/plugins.json`: user-level Plugin Registry.
- `~/.codegraphy/settings.json`: user-level CodeGraphy defaults.

Recommended default ignore:

```gitignore
.codegraphy/*
```

To share settings while ignoring generated data:

```gitignore
.codegraphy/*
!.codegraphy/settings.json
```

Do not ignore `.codegraphy/` as a directory if you need to re-include a file inside it.

Old `.codegraphy/graph.lbug` files are obsolete generated caches. Run Indexing to create `graph.sqlite`, then remove the old file. CodeGraphy does not migrate LadybugDB caches in place.

## Troubleshooting

**Empty graph**

- Check `include`, `filterPatterns`, `.gitignore`, and `maxFiles`.
- In Graph Scope, enable File, Folder, or the relevant Symbol Node Types.

**Missing Relationships**

- Run Indexing after relevant workspace changes.
- Confirm the language has Core coverage or its plugin is registered and enabled.
- Check Edge Type scope and plugin options.

**Unexpected plugin behavior**

- Run `codegraphy plugins list` from the workspace root.
- Run `codegraphy doctor` for registry, compatibility, settings, and Graph Cache checks.
- Enable [Verbose Diagnostics](./DIAGNOSTICS.md) while reproducing the problem.
