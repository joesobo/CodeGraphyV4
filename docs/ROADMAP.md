# CodeGraphy Roadmap

## Current Status (January 2026)

### ✅ Phase 1: VSCode Extension Scaffold (Complete)
- Basic extension structure
- Webview panel with React
- Tailwind CSS styling
- Build pipeline (esbuild + Vite)
- Testing infrastructure (Vitest)

### ✅ Phase 2: Graph Rendering (Complete)
- Vis Network integration
- Force-directed physics simulation
- Pastel color palette by file type
- Node interactions (click, double-click, drag)
- Position persistence to workspace state
- Keyboard shortcuts (fit, zoom, select)
- Mock data for development
- 45 tests covering core functionality

### 🔜 Phase 3: Plugin API & File Discovery (Next)
- Extension settings (#24)
- Plugin interface for community plugins
- File discovery with include/exclude patterns
- TypeScript Compiler API for import detection
- Caching with incremental updates
- Wire real files into graph

### 📋 Phase 4: Polish & Core Features (Planned)
- Search/filter functionality
- Hover highlights
- File metadata tooltips
- Theme support

---

## Phase 3 Detailed Breakdown

Phase 3 transforms CodeGraphy from a demo with mock data into a real, useful tool.

### Key Decisions
- **Community Plugins**: Design for external VSCode extension plugins from the start
- **TypeScript Compiler API**: Use `ts.createSourceFile` for accurate AST-based import detection (not regex)
- **Caching**: Initial full scan, then incremental updates for changed files only
- **Filtering**: Whitelist/blacklist patterns, respect .gitignore, max file limit

### 3.0: Extension Settings (#24)
**Estimated: 1 day**

Add user-configurable settings.

| Setting | Default | Description |
|---------|---------|-------------|
| `codegraphy.maxFiles` | `100` | Max files to analyze |
| `codegraphy.include` | `["**/*"]` | Include patterns |
| `codegraphy.exclude` | *(node_modules, dist, etc)* | Exclude patterns |
| `codegraphy.respectGitignore` | `true` | Honor .gitignore |
| `codegraphy.showOrphans` | `true` | Show unconnected files |
| `codegraphy.plugins` | `[]` | Community plugin names |

### 3.1: Plugin Architecture Foundation (#12)
**Estimated: 2-3 days**

Create the plugin system infrastructure.

- [ ] Define `IPlugin` interface for community plugins
- [ ] Plugin manifest format for VSCode extension plugins
- [ ] Create plugin registry (register/unregister/list)
- [ ] Discover plugins from installed VSCode extensions
- [ ] Unit tests for plugin system

### 3.2: File Discovery System (#13)
**Estimated: 2-3 days**

Walk the workspace and discover files to analyze.

- [ ] Recursive file traversal with glob patterns
- [ ] Respect `.gitignore` patterns
- [ ] Apply include/exclude from settings
- [ ] Enforce max file limit with warning
- [ ] File content reading with proper encoding

### 3.3: TypeScript/JavaScript Plugin (#14)
**Estimated: 3-4 days**

Built-in plugin using TypeScript Compiler API.

- [ ] Parse imports using `ts.createSourceFile` (AST-based)
- [ ] Support all import types (ES6, CommonJS, dynamic)
- [ ] Resolve relative paths (`./`, `../`)
- [ ] Resolve tsconfig/jsconfig paths
- [ ] Handle index files and extension inference

### 3.4: Python Plugin (#15)
**Estimated: 2-3 days**

Built-in plugin for Python codebases.

- [ ] Parse `import` and `from ... import` statements
- [ ] Resolve relative imports
- [ ] Handle `__init__.py` packages

### 3.5: Integration & Caching (#16)
**Estimated: 2-3 days**

Connect everything with smart caching.

- [ ] Initial full scan on workspace open
- [ ] Cache results in workspace state (file path, mtime, connections)
- [ ] Incremental updates: only re-analyze changed files
- [ ] File system watcher for real-time updates
- [ ] Invalidate cache when tsconfig changes
- [ ] Progress indicator during scan
- [ ] showOrphans setting filters display

---

## Phase 4 Detailed Breakdown

After Phase 3, the tool is functional. Phase 4 adds polish.

### 4.1: Search & Filter
- Search box in webview header
- Filter nodes by name (fuzzy match)
- Filter by file type
- Highlight matching nodes

### 4.2: Hover Interactions
- Highlight connected nodes on hover
- Dim unconnected nodes
- Show connection count badge

### 4.3: Node Tooltips
- Show file path on hover
- Show import/export count
- Show file size

### 4.4: Theme & Styling
- Respect VSCode theme (dark/light)
- Custom color schemes

---

## Timeline

| Week | Focus | Issues |
|------|-------|--------|
| Week 1 | Settings + Plugin architecture | #24, #12 |
| Week 2 | File discovery + TS plugin | #13, #14 |
| Week 3 | Python plugin + Integration | #15, #16 |
| Week 4-5 | Phase 4 polish | #4 |
| Week 6 | Buffer | Bugs, docs, marketplace |

**Target MVP Release: ~6 weeks**

---

## Completed Improvements

- [x] CI/CD with GitHub Actions
- [x] CONTRIBUTING.md
- [x] JSDoc comments on core interfaces
- [x] Keyboard shortcuts

## Remaining Improvements

- [ ] Architecture diagram
- [ ] README screenshots
- [ ] Plugin developer guide (after Phase 3)

---

## Future Ideas (Post-MVP)

- **Graph Layouts**: Hierarchical, radial, clustered
- **Export**: SVG/PNG export
- **Metrics**: Complexity overlay, test coverage
- **History**: Git integration to see evolution
- **AI Features**: "Explain this cluster", "Find related files"
