<p align="center">
  <img src="./assets/icon.png" alt="CodeGraphy icon" width="120" />
</p>

<h1 align="center">CodeGraphy</h1>

<p align="center">
  See your codebase. Understand it spatially.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/visual-studio-marketplace/v/codegraphy.codegraphy?label=core%20extension" alt="Core extension version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/visual-studio-marketplace/d/codegraphy.codegraphy?label=downloads" alt="Core extension downloads" /></a>
  <a href="https://www.npmjs.com/package/@codegraphy-vscode/plugin-api"><img src="https://img.shields.io/npm/v/%40codegraphy-vscode%2Fplugin-api?label=plugin%20api" alt="Plugin API version" /></a>
  <a href="https://github.com/joesobo/CodeGraphyV2"><img src="https://img.shields.io/badge/CodeGraphy-V2%20archive-0b7285" alt="CodeGraphy V2 archive" /></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy">Core</a>
  ·
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript">TypeScript/JavaScript Plugin</a>
  ·
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python">Python Plugin</a>
  ·
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp">C# Plugin</a>
  ·
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot">GDScript Plugin</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-vscode/plugin-api">Plugin API</a>
</p>

CodeGraphy turns file dependencies into an interactive force graph inside VS Code. Files become nodes, imports become edges, and your project's structure becomes something you can inspect, filter, and navigate instead of infer.

![CodeGraphy dependency graph](./docs/media/node-drag.gif)

## From V2 to V4

CodeGraphy V4 is a ground-up rewrite of the V2 architecture. If you want the previous generation of the project for historical context, see [CodeGraphy V2](https://github.com/joesobo/CodeGraphyV2).

Why V4 changed:

- the core extension is now focused on graph rendering, workspace analysis orchestration, and the VS Code/webview bridge
- language support is modular, with separately published marketplace plugins instead of one monolith owning every parser
- plugin authors get a typed npm package, [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api), instead of reaching into internal extension code
- the monorepo now ships its own quality tooling so refactors can be enforced with boundaries, organize checks, mutation testing, CRAP, and SCRAP

## What you get

**A live dependency graph.** Open any project and watch it map itself. Files naturally cluster based on their relationships. Drag nodes, zoom in, search, and the graph responds instantly.

**Built-in Markdown support, optional language plugins.** The core extension works out of the box for Markdown and MDX. Add TypeScript/JavaScript, Python, C#, and GDScript support as separate CodeGraphy plugin extensions when you want parser-backed dependency detection for those languages.

**Multiple perspectives.** Switch between views to inspect the same codebase in different ways:

- **Connections** shows the full dependency graph
- **Depth Graph** radiates outward from a chosen file, 1 to 5 hops deep
- **Folder** scopes the graph to a single directory

**Git timeline playback.** Index your repository history, scrub through commits, and watch the dependency graph evolve over time.

![Timeline playback](./docs/media/timeline-playback.gif)

**Configurable graph presentation.** Tune the physics, switch between 2D and 3D, adjust node sizes, assign colors with glob patterns, and filter out noise.

| 2D | 3D |
|:--:|:--:|
| ![2D graph](./docs/media/hero-graph.png) | ![3D graph](./docs/media/graph-3d.png) |

**Actions from the graph.** Open, rename, delete, favorite, and inspect files directly from the graph. Double-click to jump into source.

![Context menu](./docs/media/context-menu.png)

## Install

1. Install the [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
2. Install any language plugins you want.
3. Click the **CodeGraphy** activity bar icon in VS Code.
4. Open the graph and explore.

## Packages and extensions

| Package | Delivery | What it does |
|--------|----------|--------------|
| [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy) | VS Code extension | Core graph experience, built-in Markdown support, timeline, settings, exports |
| [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript) | VS Code extension | Detects ES modules, CommonJS, re-exports, and dynamic imports |
| [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python) | VS Code extension | Detects `import`, `from ... import`, and relative imports |
| [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp) | VS Code extension | Detects `using` directives and type usage relationships |
| [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot) | VS Code extension | Detects `preload`, `load`, `extends`, and `class_name` references |
| [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api) | npm package | Type definitions for building your own CodeGraphy plugins |

## Language support

| Support | Delivery | Extensions | Detection |
|--------|----------|------------|-----------|
| [TypeScript / JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript) | Separate plugin extension | `.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` | ES6 imports, CommonJS, dynamic imports, re-exports |
| [Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python) | Separate plugin extension | `.py` `.pyi` | `import`, `from ... import`, relative imports |
| [C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp) | Separate plugin extension | `.cs` | `using` directives, type usage |
| [GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot) | Separate plugin extension | `.gd` | `preload`, `load`, `extends`, `class_name` |
| Markdown | Built in | `.md` `.mdx` | `[[wikilinks]]` with aliases, paths, and embeds |

Want to build your own language plugin? Start with the [Plugin Guide](./docs/PLUGINS.md), the [plugin lifecycle docs](./docs/plugin-api/LIFECYCLE.md), and [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api).

## Documentation

| | |
|---|---|
| [Timeline](./docs/TIMELINE.md) | Git history playback and scrubbing |
| [Settings](./docs/SETTINGS.md) | Physics, groups, filters, and display options |
| [Commands](./docs/COMMANDS.md) | Command palette reference |
| [Keybindings](./docs/KEYBINDINGS.md) | Keyboard shortcuts |
| [Interactions](./docs/INTERACTIONS.md) | Mouse, context menu, tooltips, and panels |
| [Plugin Guide](./docs/PLUGINS.md) | Build and package plugins for CodeGraphy |
| [Quality Tools](./docs/quality/README.md) | Boundaries, organize, mutation, CRAP, and SCRAP |
| [Contributing](./CONTRIBUTING.md) | Development setup and contribution workflow |

## License

MIT
