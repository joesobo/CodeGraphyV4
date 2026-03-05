# CodeGraphy

[![CI](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml/badge.svg)](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml)

Visualize your codebase as an interactive 2D force graph. See how files connect through imports and dependencies.

## Features

- **Force-directed graph** — Files naturally cluster based on their relationships
- **Color groups** — Assign colors to files using glob patterns; all nodes start grey and groups add meaning
- **Real file analysis** — Parses actual imports using the TypeScript compiler API
- **Interactive** — Pan, zoom, drag nodes, click to select, double-click to open files
- **Position persistence** — Your graph layout is saved and restored between sessions
- **Fast** — Built with Vis Network for smooth physics simulation
- **Settings Panel** — Tune physics, manage groups, filter files, and switch views from the graph UI
- **Extensible** — Plugin architecture for language support

## Quick Start

1. Install the extension (coming to VS Code Marketplace soon)
2. Open a project with TypeScript/JavaScript files
3. Click the **CodeGraphy** icon in the activity bar
4. Explore your codebase visually!

## Keyboard Shortcuts

See the [Keybindings Reference](./docs/KEYBINDINGS.md) for all shortcuts and how to customize them.

## Configuration

See the [Settings Documentation](./docs/SETTINGS.md) for all options.

## Supported Languages

| Language | Extensions | Status |
|----------|------------|--------|
| TypeScript | `.ts`, `.tsx` | ✅ Built-in |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | ✅ Built-in |
| Godot | `.gd` | ✅ Built-in |
| Python | `.py` | 🔜 Planned |

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
| [Keybindings](./docs/KEYBINDINGS.md) | Keyboard shortcuts reference |
| [Plugin Guide](./docs/PLUGINS.md) | How to create language plugins |
| [Contributing](./CONTRIBUTING.md) | How to contribute |
| [Philosophy](./docs/PHILOSOPHY.md) | The vision behind CodeGraphy |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

MIT

---
