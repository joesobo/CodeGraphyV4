<p align="center">
  <img src="./assets/icon.png" alt="CodeGraphy icon" width="120" />
</p>

<h1 align="center">CodeGraphy</h1>

<p align="center">
  Visualize connections
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

CodeGraphy turns repository structure and code relationships into an interactive force graph inside VS Code. Files start as nodes, indexing projects richer edges into that graph, and the whole repo becomes something you can inspect, filter, and navigate instead of infer.

![CodeGraphy dependency graph](./docs/media/node-drag.gif)

## CodeGraphy History

I originally came up with CodeGraphy back in college in 2021 after seeing ![Obsidian.md](https://obsidian.md/)'s graph. I've always been a very visual thinker and so Obsidians graph felt very intuitive to me. The clusters of nodes that appeared represented bundles of knowledge that was closely entangled. These clusters reminded me of the way that code worked and the way it connecting files (whether importing, extending, referencing). I wanted to see the way the my code naturally connected, just like in Obsidian's graph and see what insights I could learn from it. And thats where CodeGraphy was born.

The first iteration was https://github.com/joesobo/CodeGraphy. Its pretty rough, but the core idea is there. 

V2 was the last published version: https://github.com/joesobo/CodeGraphyV2. This version was a huge upgrade, enabling dynamic physics and a ton more features. But it was largely limited to Javascript

So I started working on V3 https://github.com/joesobo/CodeGraphyV3 this time with a broader scope. Instead of limited ourselves to a single language. The goal was to make the core renderer reusable and let plugins teach it new language semantics when needed.

Unfortunetly I got quite busy and never was able to maintain V2 or finish V3.

CodeGraphy V4 is a ground-up for the 4th time. Probably wont be the last time either. This time its been primarly programmed via Codex. Ive followed the same concepts as the previous iterations of CodeGraphy campacted in this monorepo, as a means to test out agentic programming and different methodologies of doing so. This is not a serious project, I am doing this to learn. The project should work but I make no promises. Feel free to fork or look at any of the previous versions if you are interested in the project. Or hell submit an issue or PR.

## Monorepo

- the core extension focused on graph rendering, repo-local indexing, and the VS Code/webview bridge
- example language plugins for:
  - Typescript
  - C#
  - Python
  - Godot
  - Markdown
- typed npm package [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)
- quality tooling so refactors can be enforced (based on some of Uncle Bob's ideas):
  - boundaries
  - organize checks
  - mutation testing
  - CRAP
  - SCRAP

## Core Stack

- TypeScript
- VS Code extension host
- React webview
- Vite
- native Tree-sitter in the extension core
- LadybugDB for repo-local index storage
- `react-force-graph` + Three.js
- repo-local `.codegraphy/` settings + metadata
- shared per-file analysis results merged in plugin priority order
- pnpm monorepo

## What you get

**A unified repo graph** Open any project and CodeGraphy shows discovered file nodes immediately. Index the repo to project richer edges into the same graph surface. Drag nodes, zoom, search, and filter without switching to a separate built-in view.

**Core pipeline, plugins for enrichment** The core extension owns discovery, caching, graph projection, repo-local settings, and export flow. Built-in and external plugins contribute per-file analysis results, richer relations, extra node/edge kinds, and UI integrations.

**Broad Tree-sitter baseline** The core now ships native Tree-sitter coverage for JavaScript, TypeScript, TSX, Python, Go, Java, Rust, and C#. That means many repos produce useful semantic edges before you install any language plugin at all.

**One graph, configurable surfaces** Use the `Nodes`, `Edges`, `Legends`, and `Plugins` popups to decide what kinds of nodes and edges are visible. Turn on depth mode from the toolbar when you want the old focused depth behavior.

**Git timeline playback** Index your repository history, scrub through commits, and watch the dependency graph evolve over time.

![Timeline playback](./docs/media/timeline-playback.gif)

**Repo-local graph settings and cache** CodeGraphy stores its index and repo-specific settings under `.codegraphy/`, so graph behavior, colors, toggles, and cached analysis stay with the repo instead of polluting `.vscode/settings.json`.

**Configurable graph presentation** Tune the physics, switch between 2D and 3D, adjust node sizes, color node and edge types, assign regex-based legend rules, and filter out noise.

**Exports from cached graph data** Export the current graph as JSON/Markdown/image output, and export lightweight symbol JSON from the warmed index without rescanning the repo.

| 2D | 3D |
|:--:|:--:|
| ![2D graph](./docs/media/hero-graph.png) | ![3D graph](./docs/media/graph-3d.png) |

**Actions from the graph** Open, rename, delete, favorite, and inspect files directly from the graph. Double-click to jump into source. Just like your normal file explorer, anything you can do there you should be able to do here.

![Context menu](./docs/media/context-menu.png)

## Install

1. Install the [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
2. Optionally install plugins for unsupported languages or richer semantics. Core already handles JavaScript, TypeScript, TSX, Python, Go, Java, Rust, and C# through Tree-sitter, and Markdown ships built in.
3. Click the **CodeGraphy** activity bar icon in VS Code.
4. Open the graph.
5. Click **Index Repo** when you want semantic edges and timeline data.

Want to build your own language plugin? Start with the [Plugin Guide](./docs/PLUGINS.md), the [plugin lifecycle docs](./docs/plugin-api/LIFECYCLE.md), and [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api).

## Documentation

| | |
|---|---|
| [Timeline](./docs/TIMELINE.md) | Git history playback and incremental indexing |
| [Settings](./docs/SETTINGS.md) | `.codegraphy/settings.json`, panels, and graph controls |
| Export menu | Graph JSON/Markdown/image plus symbol JSON from the current index |
| [Commands](./docs/COMMANDS.md) | Command palette reference |
| [Keybindings](./docs/KEYBINDINGS.md) | Keyboard shortcuts |
| [Interactions](./docs/INTERACTIONS.md) | Mouse, context menu, toolbar, and panels |
| [Plugin Guide](./docs/PLUGINS.md) | Build and package plugins for CodeGraphy |
| [Contributing](./CONTRIBUTING.md) | Development setup and contribution workflow |

## License

MIT
