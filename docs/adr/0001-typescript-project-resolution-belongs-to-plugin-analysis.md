# TypeScript project resolution belongs to Plugin Analysis

**Status:** Accepted

TypeScript `compilerOptions.paths` and related project configuration define **Project-Aware Analysis Semantics**. Core provides the plugin substrate that adds relationship data and projects it into the Relationship Graph. Plugin Analysis owns TypeScript project resolution. Workspaces that do not need TypeScript semantics avoid tsconfig discovery, parsing, and alias matching.

**Considered Options**

- Put `compilerOptions.paths` in Core's JS/TS Tree-sitter resolver. Alias imports would work without a plugin, but every Core JS/TS analysis path would become responsible for TypeScript project configuration. Shallow Core Tree-sitter Language Coverage would then expand into TypeScript-aware project analysis.
- Put `compilerOptions.paths` in `@codegraphy-dev/plugin-typescript`. Core stays light, and users opt into TypeScript ecosystem semantics. Core must still merge and project plugin-owned relationship data through the standard pipeline.

**Consequences**

The TypeScript plugin may need supplemental analysis for project-aware import resolution. It should create plugin-owned relationships from TypeScript project data, such as alias-mapped imports. Core should merge and project that data without TypeScript-specific resolution logic. Alias-derived relationships should use a TypeScript-plugin-owned Edge Type labeled **TypeScript Alias Import** so Graph Scope can toggle them apart from baseline import edges.

Graph Scope should enable that Edge Type by default when the TypeScript plugin is active. The plugin should process `compilerOptions.paths` whenever it is active so the Relationship Graph, Graph Query CLI, Graph View, and exports share the same data. Graph Scope controls visibility without controlling data collection. If the plugin contract cannot support a plugin-owned Edge Type, extend the contract instead of moving TypeScript project semantics into Core.

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
