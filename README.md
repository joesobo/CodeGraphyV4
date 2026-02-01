# CodeGraphy

[![CI](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml/badge.svg)](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml)

Visualize your codebase as an interactive 2D force graph. See how files connect through imports and dependencies.

## Features

- 🔵 **Force-directed graph** — Files naturally cluster based on their relationships
- 🎨 **Color-coded by file type** — Instantly identify TypeScript, JavaScript, CSS, JSON, and more
- 🔍 **Real file analysis** — Parses actual imports using the TypeScript compiler API
- 🖱️ **Interactive** — Pan, zoom, drag nodes, click to select, double-click to open files
- 💾 **Position persistence** — Your graph layout is saved and restored between sessions
- ⚡ **Fast** — Built with Vis Network for smooth physics simulation
- 🔌 **Extensible** — Plugin architecture for language support

## Quick Start

1. Install the extension (coming to VS Code Marketplace soon)
2. Open a project with TypeScript/JavaScript files
3. Click the **CodeGraphy** icon in the activity bar
4. Explore your codebase visually!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `0` | Fit all nodes in view |
| `Escape` | Deselect all nodes |
| `Enter` | Open selected node in editor |
| `+` / `=` | Zoom in |
| `-` | Zoom out |

Customize shortcuts via **File > Preferences > Keyboard Shortcuts** → search "CodeGraphy".

## Configuration

Configure CodeGraphy in your workspace settings (`.vscode/settings.json`):

```json
{
  "codegraphy.maxFiles": 100,
  "codegraphy.include": ["src/**/*"],
  "codegraphy.exclude": ["**/node_modules/**", "**/dist/**"],
  "codegraphy.showOrphans": true,
  "codegraphy.respectGitignore": true
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
└── test-fixture/      # Sample project for testing
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
