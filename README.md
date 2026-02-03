# CodeGraphy

[![CI](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml/badge.svg)](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml)

Visualize your codebase as an interactive 2D force graph. See how files connect through imports and dependencies.

## Features

- 🔵 **Force-directed graph** — Files naturally cluster based on their relationships
- 🎨 **Color-coded by file type** — Dynamic color palette that works with any file types, customizable via settings
- 🔍 **Real file analysis** — Parses actual imports using the TypeScript compiler API
- 🖱️ **Interactive** — Pan, zoom, drag nodes, click to select, double-click to open files
- 💾 **Position persistence** — Your graph layout is saved and restored between sessions
- ⚡ **Fast** — Built with Vis Network for smooth physics simulation
- ⚙️ **Physics controls** — Tune gravity, link distance, damping, and more from the graph UI
- 🔌 **Extensible** — Plugin architecture for language support

## Quick Start

1. Install the extension (coming to VS Code Marketplace soon)
2. Open a project with TypeScript/JavaScript files
3. Click the **CodeGraphy** icon in the activity bar
4. Explore your codebase visually!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Ctrl+Click` | Add/remove node from selection |
| `Shift+Drag` | Box selection |
| `0` | Fit all nodes in view |
| `Escape` | Deselect all nodes |
| `Enter` | Open selected node(s) in editor |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Right-click` | Open context menu |

Customize shortcuts via **File > Preferences > Keyboard Shortcuts** → search "CodeGraphy".

## Configuration

Configure CodeGraphy in your workspace settings (`.vscode/settings.json`):

```json
{
  "codegraphy.maxFiles": 100,
  "codegraphy.include": ["src/**/*"],
  "codegraphy.exclude": ["**/node_modules/**", "**/dist/**"],
  "codegraphy.showOrphans": true,
  "codegraphy.respectGitignore": true,
  "codegraphy.favorites": ["src/index.ts", "src/core/engine.ts"],
  "codegraphy.fileColors": {
    ".custom": "#FF5733"
  },
  "codegraphy.physics.gravitationalConstant": -80,
  "codegraphy.physics.springLength": 140,
  "codegraphy.physics.springConstant": 0.1,
  "codegraphy.physics.damping": 0.35,
  "codegraphy.physics.centralGravity": 0.02
}
```

### Favorites

Mark important files as favorites to highlight them with a yellow border. Right-click a node and select "Add to Favorites", or configure manually:

```json
{
  "codegraphy.favorites": ["src/index.ts", "src/core/engine.ts"]
}
```

### Custom Colors

Colors are assigned automatically, but you can override any file type:

```json
{
  "codegraphy.fileColors": {
    ".ts": "#3B82F6",
    ".gitignore": "#6B7280",
    "Makefile": "#F97316",
    "**/*.test.ts": "#10B981"
  }
}
```

Supports extensions (`.ts`), exact filenames (`.gitignore`, `Makefile`), and glob patterns (`**/*.test.ts`).

Color priority: **User settings** > **Plugin defaults** > **Auto-generated**

### Physics Settings

Adjust the force simulation using the gear icon in the bottom-right of the graph. Settings persist per workspace and can also be set in `settings.json`:

```json
{
  "codegraphy.physics.gravitationalConstant": -80,
  "codegraphy.physics.springLength": 140,
  "codegraphy.physics.springConstant": 0.1,
  "codegraphy.physics.damping": 0.35,
  "codegraphy.physics.centralGravity": 0.02
}
```

See [Settings Documentation](./docs/SETTINGS.md) for all options.

## Supported Languages

| Language | Extensions | Status |
|----------|------------|--------|
| TypeScript | `.ts`, `.tsx` | ✅ Built-in |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | ✅ Built-in |
| Python | `.py` | 🔜 Planned |
| Go | `.go` | 🔜 Planned |
| Rust | `.rs` | 🔜 Planned |

Want to add a language? See the [Plugin Development Guide](./docs/PLUGINS.md).

## Development

### Prerequisites

- Node.js 20+
- npm
- VS Code 1.85+

### Setup

```bash
git clone https://github.com/livetoserveplz/CodeGraphy.git
cd CodeGraphy
npm install
npm run build
```

### Running

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Click the **CodeGraphy** icon in the sidebar

### Commands

```bash
npm run build         # Build extension and webview
npm run dev           # Watch mode for development
npm test              # Run tests
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript type checking
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System design and data flow |
| [Settings](./docs/SETTINGS.md) | Configuration options |
| [Plugin Guide](./docs/PLUGINS.md) | How to create language plugins |
| [Roadmap](./docs/ROADMAP.md) | Development phases and timeline |
| [Contributing](./CONTRIBUTING.md) | How to contribute |
| [Philosophy](./docs/PHILOSOPHY.md) | The vision behind CodeGraphy |

## Project Structure

```
CodeGraphy/
├── src/
│   ├── core/          # Core systems (discovery, plugins)
│   ├── extension/     # VSCode extension (Node.js)
│   ├── plugins/       # Language plugins
│   ├── shared/        # Shared types
│   └── webview/       # React app (browser)
├── tests/             # Test files
├── docs/              # Documentation
└── examples/          # Example projects
    ├── ts-plugin/     # TypeScript plugin demo
    ├── gdscript/      # GDScript plugin demo
    └── default/       # Basic file types demo
```

## Roadmap

- [x] **Phase 1**: VSCode extension scaffold
- [x] **Phase 2**: Graph rendering with Vis Network
- [x] **Phase 3**: Plugin system & real file analysis
- [ ] **Phase 4**: Search, filter, and polish

See [ROADMAP.md](./docs/ROADMAP.md) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

MIT

---

Made with 🐳 by [LIVE](https://github.com/livetoserveplz)
