# CodeGraphy

Visualize your codebase as an interactive 2D force graph. See how files connect through imports and dependencies.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch mode (development)

```bash
npm run dev
```

### Run the extension

1. Open this folder in VS Code
2. Press F5 to launch the Extension Development Host
3. Click the CodeGraphy icon in the activity bar (sidebar)

### Testing

```bash
npm run test        # Run tests once
npm run test:watch  # Watch mode
```

### Linting

```bash
npm run lint
npm run typecheck
```

## Project Structure

```
CodeGraphy/
├── src/
│   ├── extension/     # VSCode extension host code
│   └── webview/       # React app for the sidebar
├── tests/
│   ├── extension/     # Extension tests
│   └── webview/       # React component tests
├── assets/            # Icons and static assets
└── dist/              # Built output (gitignored)
```
