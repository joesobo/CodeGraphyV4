# TypeScript Project Resolution Belongs To Plugin Analysis

**Status:** Accepted

TypeScript `compilerOptions.paths` and related project configuration are **Project-Aware Analysis Semantics**, not baseline syntax parsing. Core should provide the plugin substrate for adding relationship data and projecting it into the Relationship Graph, while TypeScript-specific project resolution such as `compilerOptions.paths` belongs in Plugin Analysis so workspaces that do not care about TypeScript semantics do not pay for tsconfig discovery, parsing, and alias matching.

**Considered Options**

- Put `compilerOptions.paths` in Core's JS/TS Tree-sitter resolver. This makes alias imports work out of the box, but it makes every Core JS/TS analysis path responsible for TypeScript project configuration and risks turning shallow Core Tree-sitter Language Coverage into TypeScript-aware project analysis.
- Put `compilerOptions.paths` in `@codegraphy-dev/plugin-typescript`. This keeps Core light and lets users opt into TypeScript ecosystem semantics, but Core must continue to support plugin-owned relationship data flowing through the normal merge and Graph Projection pipeline.

**Consequences**

The TypeScript plugin may need to resume supplemental analysis for project-aware import resolution. It should create plugin-owned relationships from TypeScript project data, such as alias-mapped imports, and Core should merge and project that additional data without needing TypeScript-specific resolution logic itself. Alias-derived relationships should use a TypeScript-plugin-owned Edge Type labeled **TypeScript Alias Import** so Graph Scope can toggle them independently from baseline import edges.

That Edge Type should default on in Graph Scope so alias-derived relationships are visible when the TypeScript plugin is enabled. The plugin should process `compilerOptions.paths` whenever the plugin is enabled so the Relationship Graph, Graph Query CLI, Graph View, and export paths have the same relationship data available. Graph Scope should hide or show those relationships in visual and scoped graph views without controlling whether the plugin collects the data. If the existing plugin contract is not sufficient for plugin-owned edge-type contribution, extend the plugin contract deliberately instead of moving TypeScript project semantics into Core by default.

**Implementation Alignment**

- For each TypeScript source file, use the nearest ancestor `tsconfig.json` within the CodeGraphy Workspace root. This matches TypeScript/editor-style project discovery better than requiring a root workspace config and supports nested projects in monorepos.
- Support local relative and package-based `extends` chains so shared configs such as `tsconfig.base.json` or `@org/tsconfig/base` can provide `compilerOptions.paths`.
- Support `compilerOptions.baseUrl` because TypeScript resolves `paths` targets relative to the config's base URL when present.
- Support any TypeScript `compilerOptions.paths` mapping, not only `@/...` prefixes.
- Support exact aliases and wildcard aliases.
- Support fallback target arrays by trying targets in TypeScript order and using the first workspace file that exists.
- Do not create a relationship for unresolved alias imports because there is no graph target.
- Limit this slice to TypeScript configuration. Do not read `jsconfig.json` until CodeGraphy has a JavaScript-specific plugin or a deliberate JavaScript project-analysis story.
- Keep alias-derived relationships separate from baseline import relationships by using the **TypeScript Alias Import** Edge Type even when both edges resolve to the same target file.
- Re-analyze affected TypeScript files when `tsconfig*.json` changes, not only the changed config file node.
