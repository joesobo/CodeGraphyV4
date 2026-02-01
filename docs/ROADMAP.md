# CodeGraphy Roadmap

> **Vision:** Make codebase architecture visible, memorable, and actionable.

## Strategic Overview

CodeGraphy transforms how developers understand code. While file systems organize code by location, CodeGraphy reveals the *truth*: how code actually connects. This spatial understanding becomes muscle memory—developers navigate by relationship, not by folder.

### Competitive Positioning

| Tool | Focus | Limitation |
|------|-------|------------|
| VSCode's built-in | File tree | No relationship visibility |
| Madge/dependency-cruiser | CLI output, static images | Not interactive, not integrated |
| Code City | 3D visualization | Complex, high cognitive load |
| JetBrains diagrams | UML-style | Formal, not spatial/intuitive |
| **CodeGraphy** | Spatial intuition, plugin extensibility | *Our opportunity* |

**Our differentiators:**
1. **Integrated experience** — Lives in VSCode, one click away
2. **Spatial memory** — Consistent layouts create mental maps
3. **Plugin architecture** — Community can add any language
4. **Performance-first** — Handles real-world codebases

---

## Current Status (February 2026)

### ✅ Phase 1: Extension Scaffold (Complete)
- VSCode extension structure
- React webview with Tailwind CSS
- Build pipeline (esbuild + Vite)
- Testing infrastructure (Vitest)

### ✅ Phase 2: Graph Rendering (Complete)
- Vis Network integration with physics simulation
- Color palette by file type (auto + custom)
- Node interactions (click, double-click, drag)
- Position persistence across sessions
- Keyboard shortcuts (fit, zoom, select)

### ✅ Phase 3: Plugin System (Complete)
- Configuration system with reactive updates
- Plugin architecture with PluginRegistry
- File discovery with include/exclude patterns
- TypeScript plugin with TS Compiler API
- GDScript plugin for Godot projects
- Path alias resolution from tsconfig.json
- Caching with mtime invalidation
- **158 tests total**

### 🔄 Phase 4: Polish & UX (In Progress)
Core usability features before marketplace launch:
- [ ] Search & filter nodes
- [ ] Hover highlighting of connections
- [ ] Node tooltips with metadata
- [ ] VSCode theme integration
- [ ] Progress indicators during analysis
- [ ] Undo/Redo for layout changes (#43)
- [ ] Node context menu & multi-select (#33)

---

## Phase 5: Language Ecosystem (Q1 2026)

**Goal:** Support the most popular languages to maximize user reach.

### Priority Languages

| Language | Complexity | Value | Priority |
|----------|------------|-------|----------|
| Python | Medium | Very High | 🔴 P0 |
| C# (General) | Medium | High | 🔴 P0 |
| Go | Low | High | 🟡 P1 |
| Rust | Medium | High | 🟡 P1 |
| Java | Medium | High | 🟡 P1 |
| Ruby | Low | Medium | 🟢 P2 |
| C/C++ | High | Medium | 🟢 P2 |
| PHP | Low | Medium | 🟢 P2 |

### Plugin Development Strategy

1. **Python** (#28): Use tree-sitter for accurate AST parsing
   - Handle `import x`, `from x import y`, relative imports
   - Support virtual environments and `pyproject.toml`

2. **C# General** (#37): Extend beyond Godot
   - Parse `using` statements
   - Handle namespaces and project references
   - Support `.csproj` for assembly references

3. **Godot C#** (#30): Extend GDScript plugin
   - Resource references in C# files
   - Cross-language dependencies (GDScript ↔ C#)

### External Plugin System (Phase 5.5)

Enable community plugins:
```json
{
  "codegraphy.plugins": ["@codegraphy/python", "./my-plugin.js"]
}
```

- npm-based plugin distribution
- Plugin manifest format
- Security sandboxing
- Hot reload during development

---

## Phase 6: Power Features (Q2 2026)

**Goal:** Transform CodeGraphy from "nice to have" to "essential tool."

### 6.1: Graph Intelligence

**Dead Code Detection**
- Identify files with no incoming edges (never imported)
- Flag exports that are never used
- "Unused code" overlay mode

**Circular Dependency Detection**
- Highlight A→B→C→A cycles
- Suggest break points
- Track cycle count over time

**Centrality Analysis**
- Identify "hub" files (many imports)
- Flag potential refactoring targets
- Visualize with node size

### 6.2: Git Integration

**History Mode**
- Slider to view graph at any commit
- Watch architecture evolve over time
- "When did this connection appear?"

**Blame Overlay**
- Color nodes by last author
- Identify ownership patterns
- "Who should I ask about this?"

**Change Frequency Heat Map**
- Hot spots = frequently changed files
- Correlate with bug density
- Stability indicator overlay

### 6.3: Export & Sharing

**Static Exports**
- PNG/SVG for documentation
- Include in READMEs
- High-res for presentations

**Interactive HTML Export**
- Self-contained single file
- Share with stakeholders
- Embed in wikis

**Layout Save/Load**
- Export layout as JSON
- Share team-agreed arrangements
- Version control layouts

---

## Phase 7: Collaboration (Q3 2026)

**Goal:** Make CodeGraphy a team tool, not just individual.

### 7.1: Shared Layouts

- `.codegraphy/layout.json` in repo
- Team-agreed canonical view
- Merge conflict handling

### 7.2: Annotations

- Add notes to nodes/edges
- "Here be dragons" warnings
- Onboarding breadcrumbs

### 7.3: Live Collaboration (Stretch)

- See teammates' cursors
- Collaborative exploration
- Pair programming aid

---

## Phase 8: AI-Powered Insights (Q4 2026)

**Goal:** Let AI explain what the graph shows.

### 8.1: Natural Language Queries

> "What does the auth module depend on?"
> "Find all files that import the database layer"
> "Why is this file connected to so many others?"

### 8.2: Refactoring Suggestions

- "This cluster could be a separate module"
- "These files are tightly coupled, consider interface"
- "This file has too many responsibilities"

### 8.3: Onboarding Assistant

- "Start here" recommendations for new devs
- Architecture tour generation
- Auto-generate documentation from structure

---

## Killer Feature Candidates

These could be the "aha" moment that makes CodeGraphy go viral:

### 🎯 1. "Understand in 30 Seconds"
New to a codebase? Open CodeGraphy and instantly see:
- Entry points (files with no incoming edges)
- Core files (highest centrality)
- Natural module boundaries (clusters)
- Trouble spots (cycles, high coupling)

### 🎯 2. Test Coverage Overlay
Import test coverage data, show as node colors:
- 🟢 Green = well tested
- 🟡 Yellow = partial
- 🔴 Red = untested
Answer: "What's actually covered?" at a glance.

### 🎯 3. "Time Travel" Architecture
Git history + graph = movie of your architecture evolving.
- See technical debt accumulate
- Watch modules form organically
- "Before/after refactoring" comparisons

### 🎯 4. External Dependency Visualization
Show node_modules/pip packages as external nodes:
- See your actual dependency footprint
- Identify over-relied-upon packages
- Upgrade impact analysis

---

## Success Metrics

| Milestone | Target | Status |
|-----------|--------|--------|
| Marketplace publish | Q1 2026 | 🎯 Next |
| 1,000 installs | Q1 2026 | Pending |
| 10,000 installs | Q2 2026 | Pending |
| 5 community plugins | Q2 2026 | Pending |
| 4.5+ star rating | Q2 2026 | Pending |

---

## Timeline Summary

```
2026 Q1    Q2       Q3       Q4
├────┼────┼────┼────┼────┼────┼────┼────┤
│ P4 │ P5 │ P6      │ P7 │ P8      │
│UX  │Lang│Power    │Team│AI       │
│    │    │Features │    │Insights │
└────┴────┴─────────┴────┴─────────┘
     ↑
     Marketplace Launch
```

---

## How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup.

**High-impact areas:**
1. **Language plugins** — Pick a language, implement the interface
2. **UI polish** — Help complete Phase 4 items
3. **Documentation** — Screenshots, tutorials, examples
4. **Testing** — Edge cases, performance benchmarks

---

## Open Issues

Track progress on GitHub:
- [Phase 4 milestone](https://github.com/livetoserveplz/CodeGraphy/issues?q=label:phase-4)
- [Enhancement requests](https://github.com/livetoserveplz/CodeGraphy/issues?q=label:enhancement)

---

*Last updated: February 2026*
*This roadmap is a living document. Priorities may shift based on user feedback and community contributions.*
