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
- Mock data for development
- 45 tests covering core functionality

### 🔜 Phase 3: Plugin API & File Discovery (Next)
- Plugin interface definition
- File discovery system
- TypeScript/JavaScript import detection
- Python import detection
- Wire real files into graph

### 📋 Phase 4: Polish & Core Features (Planned)
- Search/filter functionality
- Hover highlights
- File metadata tooltips
- Directory grouping
- Theme support

---

## Phase 3 Detailed Breakdown

Phase 3 is the **most important phase** — it's where CodeGraphy transforms from a demo with mock data into a real, useful tool. This phase should be broken into smaller, mergeable PRs.

### 3.1: Plugin Architecture Foundation
**Estimated: 2-3 days**

Create the plugin system infrastructure without any actual plugins yet.

- [ ] Define `IPlugin` interface
  ```typescript
  interface IPlugin {
    id: string;
    name: string;
    version: string;
    supportedExtensions: string[];
    detectConnections(file: IFileData, content: string): string[];
  }
  ```
- [ ] Create plugin registry (register/unregister/list)
- [ ] Create plugin loader
- [ ] Add plugin configuration schema to package.json
- [ ] Unit tests for plugin system

**Files to create:**
- `src/core/plugins/types.ts` — Plugin interfaces
- `src/core/plugins/PluginRegistry.ts` — Registry class
- `src/core/plugins/PluginLoader.ts` — Loader class
- `tests/core/plugins/` — Plugin system tests

### 3.2: File Discovery System
**Estimated: 2-3 days**

Walk the workspace and discover files to analyze.

- [ ] Recursive file traversal
- [ ] Respect `.gitignore` patterns
- [ ] Configurable ignore patterns (node_modules, dist, etc.)
- [ ] File content reading with proper encoding
- [ ] Watch mode for file changes (future)
- [ ] Performance: handle large codebases (10k+ files)

**Files to create:**
- `src/core/discovery/FileDiscovery.ts` — Main discovery class
- `src/core/discovery/IgnorePatterns.ts` — Gitignore handling
- `src/core/discovery/types.ts` — Discovery types
- `tests/core/discovery/` — Discovery tests

### 3.3: TypeScript/JavaScript Plugin
**Estimated: 3-4 days**

The first real plugin — detects imports in TS/JS files.

- [ ] Parse `import ... from '...'` statements
- [ ] Parse `require('...')` calls
- [ ] Parse `import('...')` dynamic imports
- [ ] Resolve relative paths (`./`, `../`)
- [ ] Resolve alias paths (tsconfig paths)
- [ ] Resolve node_modules imports (optional, configurable)
- [ ] Handle index files (`./folder` → `./folder/index`)
- [ ] Handle extension inference (`.ts`, `.tsx`, `.js`, etc.)

**Files to create:**
- `src/plugins/typescript/index.ts` — Plugin entry
- `src/plugins/typescript/ImportDetector.ts` — Import parsing
- `src/plugins/typescript/PathResolver.ts` — Path resolution
- `tests/plugins/typescript/` — Plugin tests

### 3.4: Python Plugin
**Estimated: 2-3 days**

Second plugin for Python codebases.

- [ ] Parse `import module` statements
- [ ] Parse `from module import ...` statements
- [ ] Resolve relative imports
- [ ] Handle `__init__.py` packages
- [ ] Handle common patterns (Django, Flask structure)

**Files to create:**
- `src/plugins/python/index.ts` — Plugin entry
- `src/plugins/python/ImportDetector.ts` — Import parsing
- `tests/plugins/python/` — Plugin tests

### 3.5: Integration & Wiring
**Estimated: 2-3 days**

Connect everything together.

- [ ] GraphViewProvider calls file discovery on workspace open
- [ ] Discovered files sent to webview
- [ ] Real-time updates when files change
- [ ] Progress indicator during initial scan
- [ ] Error handling for unreadable files
- [ ] Configuration UI (enable/disable plugins)

---

## Phase 4 Detailed Breakdown

After Phase 3, the tool is functional. Phase 4 adds polish.

### 4.1: Search & Filter
**Estimated: 2 days**

- [ ] Search box in webview header
- [ ] Filter nodes by name (fuzzy match)
- [ ] Filter by file type
- [ ] Highlight matching nodes
- [ ] Clear filter button

### 4.2: Hover Interactions
**Estimated: 1-2 days**

- [ ] Highlight connected nodes on hover
- [ ] Dim unconnected nodes
- [ ] Show connection count badge
- [ ] Smooth transitions

### 4.3: Node Tooltips
**Estimated: 1-2 days**

- [ ] Show file path on hover
- [ ] Show file size
- [ ] Show import/export count
- [ ] Show last modified date (optional)

### 4.4: Directory Grouping
**Estimated: 3-4 days**

- [ ] Visual boundaries around directory groups
- [ ] Collapse/expand directories
- [ ] Color-code by directory
- [ ] Group physics (nodes in same dir attract)

### 4.5: Theme & Styling
**Estimated: 1-2 days**

- [ ] Respect VSCode theme (dark/light)
- [ ] Custom color schemes
- [ ] Configurable node sizes
- [ ] Edge style options

---

## Rough Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| Week 1 | Phase 3.1-3.2 | Plugin architecture + File discovery |
| Week 2 | Phase 3.3 | TypeScript plugin working |
| Week 3 | Phase 3.4-3.5 | Python plugin + Integration |
| Week 4 | Phase 4.1-4.2 | Search/filter + Hover interactions |
| Week 5 | Phase 4.3-4.5 | Tooltips + Grouping + Polish |
| Week 6 | Buffer | Bug fixes, docs, marketplace prep |

**Target MVP Release: ~6 weeks from now**

---

## Smaller Issues / Improvements

These can be done anytime as quick wins:

### Code Quality
- [ ] Add JSDoc comments to all public interfaces
- [ ] Create CONTRIBUTING.md
- [ ] Add code coverage reporting
- [ ] Set up CI/CD (GitHub Actions)

### Documentation
- [ ] Architecture diagram
- [ ] Plugin development guide
- [ ] API reference
- [ ] Screenshots for README

### Developer Experience
- [ ] Hot reload for webview during development
- [ ] Debug logging with configurable levels
- [ ] Performance profiling utilities

### Bug Fixes / Polish
- [ ] Handle edge case: file with no connections (orphan nodes)
- [ ] Handle edge case: circular imports visualization
- [ ] Better error messages for common issues
- [ ] Keyboard shortcuts (focus search, reset view)

---

## Future Ideas (Post-MVP)

- **Graph Layouts**: Alternative layouts (hierarchical, radial, force clusters)
- **Export**: Export graph as SVG/PNG
- **Metrics**: Code complexity overlay, file churn, test coverage
- **History**: See how graph evolved over time (git integration)
- **Collaboration**: Share graph views with team
- **Cross-repo**: Visualize monorepo or multi-repo dependencies
- **AI Features**: "Explain this cluster", "Find related files"
