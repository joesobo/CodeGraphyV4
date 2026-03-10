# Plugin Development Guide

> **Plugin API v2 is in development.** The new API expands plugins beyond connection detection into a full extensibility platform (decorations, events, views, commands, webview injection). See the v2 docs:
>
> - **[Lifecycle](./plugin-api/LIFECYCLE.md)** — Plugin lifecycle phases and hooks
> - **[Events](./plugin-api/EVENTS.md)** — 30+ typed events plugins can subscribe to
> - **[Types](./plugin-api/TYPES.md)** — Full TypeScript API reference
> - **[Design Spec](./superpowers/specs/2026-03-10-plugin-api-v2-design.md)** — Architecture and design decisions
>
> The guide below covers the **current v1 API** for language connection detection.

This guide covers how to create language plugins for CodeGraphy.

![Plugins panel](./media/plugins-panel.png)

## Overview

Each plugin is responsible for:

1. Declaring which file extensions it supports
2. Detecting connections (imports/dependencies) in source files
3. Declaring detection rules that users can toggle individually

## Plugin structure

Every plugin follows the same directory layout:

```
packages/plugin-my-language/
  codegraphy.json      # Static metadata (id, name, rules, colors, etc.)
  src/
    index.ts           # Thin orchestrator that loads metadata and calls rules
    PathResolver.ts    # Path resolution logic
    rules/
      rule-a.ts        # One file per detection rule
      rule-b.ts
```

See `packages/plugin-typescript/` for the reference implementation.

## codegraphy.json

All static plugin metadata lives in `codegraphy.json`:

```json
{
  "id": "codegraphy.my-language",
  "name": "My Language",
  "version": "1.0.0",
  "supportedExtensions": [".ml", ".mli"],
  "defaultFilters": ["**/build/**", "**/.cache/**"],
  "fileColors": {
    ".ml": "#E44D26",
    ".mli": "#F7DF1E"
  },
  "rules": [
    { "id": "import-statement", "name": "Import Statements", "description": "import x from \"y\"" },
    { "id": "require-call", "name": "Require Calls", "description": "require(\"module\")" }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique plugin identifier (e.g., `codegraphy.typescript`) |
| `name` | Yes | Human-readable display name |
| `version` | Yes | Semantic version string |
| `supportedExtensions` | Yes | File extensions this plugin handles |
| `defaultFilters` | No | Glob patterns for files to exclude from analysis |
| `fileColors` | No | Preferred colors for file types (extensions, filenames, or globs) |
| `rules` | No | Detection rules users can toggle in the Plugins panel |

Color priority: User settings > Plugin `fileColors` > Auto-generated colors.

## Rule files

Each rule file in `rules/` exports a `detect()` function and a default `IRuleDetector` object:

```typescript
// rules/import-statement.ts
import type { IConnection, IRuleDetector } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

interface MyContext {
  resolver: PathResolver;
}

export function detect(
  content: string,
  filePath: string,
  ctx: MyContext
): IConnection[] {
  const connections: IConnection[] = [];

  // Parse content and find imports...
  // For each detected import:
  connections.push({
    specifier: 'the-import-specifier',
    resolvedPath: ctx.resolver.resolve('the-import-specifier', filePath),
    type: 'static',
    ruleId: 'import-statement',  // Must match the rule id in codegraphy.json
  });

  return connections;
}

const rule: IRuleDetector<MyContext> = { id: 'import-statement', detect };
export default rule;
```

Every `IConnection` returned by a rule **must** set `ruleId` to the rule's id from `codegraphy.json`.

## IConnection interface

```typescript
interface IConnection {
  /** The import specifier as written in source (e.g., './utils', 'lodash') */
  specifier: string;
  /** Resolved absolute file path, or null if unresolved (external package) */
  resolvedPath: string | null;
  /** Type of import */
  type: 'static' | 'dynamic' | 'require' | 'reexport';
  /** Rule that detected this connection, must match a rule id in codegraphy.json */
  ruleId?: string;
}
```

## index.ts orchestrator

The orchestrator loads metadata from `codegraphy.json` and delegates detection to rule modules:

```typescript
import { IPlugin, IConnection } from '../../core/plugins';
import { PathResolver } from './PathResolver';
import manifest from '../codegraphy.json';

import { detect as detectImport } from './rules/import-statement';
import { detect as detectRequire } from './rules/require-call';

export function createMyLanguagePlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    rules: manifest.rules,
    fileColors: manifest.fileColors,

    async initialize(workspaceRoot: string): Promise<void> {
      resolver = new PathResolver(workspaceRoot);
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) resolver = new PathResolver(workspaceRoot);
      const ctx = { resolver };

      return [
        ...detectImport(content, filePath, ctx),
        ...detectRequire(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
    },
  };
}

export default createMyLanguagePlugin;
```

## IPlugin interface

The full interface from `src/core/plugins/types.ts`:

```typescript
interface IPlugin {
  id: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  rules?: IRule[];
  fileColors?: Record<string, string>;
  defaultFilters?: string[];

  detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]>;

  initialize?(workspaceRoot: string): Promise<void>;

  /** Called before each analysis pass with discovered files */
  onPreAnalyze?(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void>;

  onUnload?(): void;
}
```

## Optional hooks

### onPreAnalyze

Called once before `detectConnections` runs on individual files. Receives all discovered files for your plugin's extensions. Use this to build workspace-wide indexes needed for cross-file resolution.

For example, the GDScript plugin uses `onPreAnalyze` to build a `class_name` map so `extends Player` can resolve to the file that declares `class_name Player`.

### initialize / onUnload

Called when the plugin is loaded or unloaded. Use for one-time setup and cleanup.

## Registering a plugin

Built-in plugins are registered in the extension entry point:

```typescript
// src/extension/index.ts
import { PluginRegistry } from '../core/plugins';
import { createTypeScriptPlugin } from '../plugins/typescript';

const registry = new PluginRegistry();
registry.register(createTypeScriptPlugin(), { builtIn: true });
```

## Built-in plugins

| Plugin | Extensions | Rules |
|--------|-----------|-------|
| [TypeScript](../packages/plugin-typescript/) | `.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` | ES6 Imports, Re-exports, Dynamic Imports, CommonJS Require |
| [Python](../packages/plugin-python/) | `.py` `.pyi` | Standard Imports, From Imports |
| [C#](../packages/plugin-csharp/) | `.cs` | Using Directives, Type Usage |
| [GDScript](../packages/plugin-godot/) | `.gd` | Preload, Load, Extends, Class Name Usage |
| [Markdown](../packages/plugin-markdown/) | `.md` `.mdx` | Wikilinks |

## Best practices

1. **Use proper parsers** when available (e.g., TypeScript Compiler API). Fall back to regex for simpler languages.
2. **Set `ruleId`** on every connection so users can toggle individual detection rules.
3. **Keep rule files focused** with one detection pattern per file.
4. **Use `defaultFilters`** for build artifacts and caches that should never appear in the graph.
5. **Test via the plugin interface** by calling `createXxxPlugin()` and testing `detectConnections()` directly.

## Need help?

Check existing plugins in `packages/plugin-*/` (TypeScript is the reference implementation) or open an issue on GitHub.
