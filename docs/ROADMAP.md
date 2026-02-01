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
- 45+ tests covering core functionality

### ✅ Phase 3: Plugin API & File Discovery (Complete)
- Extension settings with Configuration wrapper
- Plugin architecture with PluginRegistry
- File discovery with include/exclude patterns
- TypeScript Compiler API for accurate import detection
- Path alias resolution from tsconfig.json
- Caching with mtime-based invalidation
- Real workspace file analysis
- 158 tests total

### 🔜 Phase 4: Polish & Core Features (Next)
- Search/filter functionality
- Hover highlights
- File metadata tooltips
- Theme support

---

## Phase 3 Summary (Completed)

Phase 3 transformed CodeGraphy from a demo with mock data into a real, useful tool.

### What Was Built

| Component | Description |
|-----------|-------------|
| **FileDiscovery** | Recursive file discovery with glob patterns, .gitignore support |
| **PluginRegistry** | Plugin registration, extension mapping, graceful error handling |
| **TypeScript Plugin** | AST-based import detection using `ts.createSourceFile` |
| **PathResolver** | Resolves relative paths, aliases, and index files |
| **Configuration** | Type-safe settings wrapper with reactive updates |
| **WorkspaceAnalyzer** | Coordinates discovery → analysis → graph building |

### Settings Added

| Setting | Default | Description |
|---------|---------|-------------|
| `codegraphy.maxFiles` | `100` | Max files to analyze |
| `codegraphy.include` | `["**/*"]` | Include patterns |
| `codegraphy.exclude` | *(node_modules, dist, etc)* | Exclude patterns |
| `codegraphy.respectGitignore` | `true` | Honor .gitignore |
| `codegraphy.showOrphans` | `true` | Show unconnected files |
| `codegraphy.plugins` | `[]` | External plugin paths (future) |

### Issues Closed
- #12: Plugin Architecture Foundation
- #13: File Discovery System
- #14: TypeScript/JavaScript Plugin
- #16: Integration & Wiring
- #24: Extension Settings Configuration
- #3: Phase 3 (parent issue)

---

## Phase 4 Detailed Breakdown

Phase 4 adds polish and usability improvements.

### 4.1: Search & Filter
- Search box in webview header
- Filter nodes by name (fuzzy match)
- Filter by file type
- Highlight matching nodes
- Clear/reset filters

### 4.2: Hover Interactions
- Highlight connected nodes on hover
- Dim unconnected nodes
- Show connection count badge
- Trace import paths

### 4.3: Node Tooltips
- Show full file path on hover
- Show import/export count
- Show file size
- Show last modified time

### 4.4: Theme & Styling
- Respect VSCode theme (dark/light)
- Custom color schemes
- Adjust physics settings
- Node size options

### 4.5: UX Polish
- Progress indicator during analysis
- Empty state messaging
- Error handling improvements
- Performance optimizations for large graphs

---

## Timeline

| Phase | Status | Duration |
|-------|--------|----------|
| Phase 1 | ✅ Complete | 2 days |
| Phase 2 | ✅ Complete | 3 days |
| Phase 3 | ✅ Complete | 5 days |
| Phase 4 | 🔜 Next | ~2 weeks |
| Marketplace | 📋 Planned | 1 week |

**Target Marketplace Release: ~3 weeks**

---

## Documentation Status

- [x] CI/CD with GitHub Actions
- [x] CONTRIBUTING.md
- [x] JSDoc comments on core interfaces
- [x] Keyboard shortcuts
- [x] Architecture diagram (`docs/ARCHITECTURE.md`)
- [x] Settings documentation (`docs/SETTINGS.md`)
- [x] Plugin developer guide (`docs/PLUGINS.md`)
- [ ] README screenshots (after UI polish)

---

## Future Ideas (Post-MVP)

- **More Languages**: Python, Go, Rust, Java, C#
- **Graph Layouts**: Hierarchical, radial, clustered
- **Export**: SVG/PNG export of graphs
- **Metrics**: Complexity overlay, test coverage visualization
- **History**: Git integration to see codebase evolution
- **AI Features**: "Explain this cluster", "Find related files"
- **Multi-root Workspaces**: Support for monorepos
- **Performance**: Virtual scrolling for very large graphs
