# CodeGraphy

[![CI](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml/badge.svg)](https://github.com/livetoserveplz/CodeGraphy/actions/workflows/ci.yml)

Visualize your codebase as an interactive 2D force graph. See how files connect through imports and dependencies.

## Features

- 🔵 **Force-directed graph** — Files naturally cluster based on their relationships
- 🎨 **Color-coded by file type** — Instantly identify TypeScript, JavaScript, CSS, JSON, and more
- 🖱️ **Interactive** — Pan, zoom, drag nodes, click to select, double-click to open files
- 💾 **Position persistence** — Your graph layout is saved and restored
- ⚡ **Fast** — Built with Vis Network for smooth physics simulation

## Keyboard Shortcuts

CodeGraphy provides keyboard shortcuts for quick graph navigation. These shortcuts work when the graph view is focused.

| Shortcut | Action |
|----------|--------|
| `0` | Fit all nodes in view |
| `Escape` | Deselect all nodes |
| `Enter` | Open selected node in editor |
| `+` / `=` | Zoom in |
| `-` | Zoom out |

### Customizing Shortcuts

You can customize these shortcuts in VS Code's keyboard settings:

1. Open **File > Preferences > Keyboard Shortcuts** (or `Ctrl+K Ctrl+S`)
2. Search for "CodeGraphy"
3. Click the pencil icon next to any command to change its keybinding

Available commands:
- `codegraphy.open` — Open CodeGraphy panel
- `codegraphy.fitView` — Fit all nodes in view
- `codegraphy.zoomIn` — Zoom in
- `codegraphy.zoomOut` — Zoom out

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- VS Code 1.85+

### Installation (Development)

```bash
# Clone the repository
git clone https://github.com/livetoserveplz/CodeGraphy.git
cd CodeGraphy

# Install dependencies
npm install

# Build
npm run build
```

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Click the **CodeGraphy** icon in the activity bar (sidebar)
4. Explore the interactive graph!

## Development

### Commands

```bash
npm run build         # Build extension and webview
npm run dev           # Watch mode for development
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript type checking
```

### Project Structure

```
CodeGraphy/
├── src/
│   ├── extension/     # VSCode extension host code (Node.js)
│   ├── shared/        # Shared types and utilities
│   └── webview/       # React app for the sidebar (browser)
├── tests/             # Test files
├── docs/              # Documentation
│   ├── PHILOSOPHY.md  # Project philosophy
│   └── ROADMAP.md     # Development roadmap
└── assets/            # Icons and static assets
```

## Documentation

- [Philosophy](./docs/PHILOSOPHY.md) — The vision behind CodeGraphy
- [Roadmap](./docs/ROADMAP.md) — Development phases and timeline
- [Contributing](./CONTRIBUTING.md) — How to contribute

## Roadmap

- [x] **Phase 1**: VSCode extension scaffold
- [x] **Phase 2**: Graph rendering with Vis Network
- [ ] **Phase 3**: Plugin system & real file discovery
- [ ] **Phase 4**: Search, filter, and polish

See the full [ROADMAP.md](./docs/ROADMAP.md) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on the development process and how to submit pull requests.

## License

MIT

---

Made with 🐳 by [LIVE](https://github.com/livetoserveplz)
