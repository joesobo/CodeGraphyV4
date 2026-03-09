# Plugin Development Guide

This guide explains how to create language plugins for CodeGraphy.

## Overview

CodeGraphy uses a plugin system to support different programming languages. Each plugin is responsible for:

1. Declaring which file extensions it supports
2. Detecting connections (imports/dependencies) in source files
3. Declaring detection rules that users can toggle individually

## Plugin Structure

Every plugin follows the same directory layout:

```
src/plugins/my-language/
  manifest.json        # Static metadata (id, name, rules, colors, etc.)
  index.ts             # Thin orchestrator — loads manifest, calls rules
  PathResolver.ts      # Path resolution logic
  rules/
    rule-a.ts          # One file per detection rule
    rule-b.ts
  README.md            # Short plugin documentation
```

See `src/plugins/typescript/` for the canonical reference implementation.

## manifest.json

All static plugin metadata lives in `manifest.json`:

```json
{
  "id": "codegraphy.my-language",
  "name": "My Language",
  "version": "1.0.0",
  "supportedExtensions": [".ml", ".mli"],
  "defaultExclude": ["**/build/**", "**/.cache/**"],
  "defaultFilterPatterns": [],
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
| `defaultExclude` | No | Glob patterns for files to never analyze |
| `defaultFilterPatterns` | No | Glob patterns for files to filter from the graph |
| `fileColors` | No | Preferred colors for file types (extensions, filenames, or globs) |
| `rules` | No | Detection rules users can toggle in the Plugins panel |

**Color priority:** User settings > Plugin `fileColors` > Auto-generated colors.

## Rule Files

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
    ruleId: 'import-statement',  // Must match the rule id in manifest.json
  });

  return connections;
}

const rule: IRuleDetector<MyContext> = { id: 'import-statement', detect };
export default rule;
```

Every `IConnection` returned by a rule **must** set `ruleId` to the rule's id from `manifest.json`.

## IConnection Interface

```typescript
interface IConnection {
  /** The import specifier as written in source (e.g., './utils', 'lodash') */
  specifier: string;
  /** Resolved absolute file path, or null if unresolved (external package) */
  resolvedPath: string | null;
  /** Type of import */
  type: 'static' | 'dynamic' | 'require' | 'reexport';
  /** Rule that detected this connection — must match a rule id in manifest.json */
  ruleId?: string;
}
```

## index.ts Orchestrator

The orchestrator loads metadata from `manifest.json` and delegates detection to rule modules:

```typescript
import { IPlugin, IConnection } from '../../core/plugins';
import { PathResolver } from './PathResolver';
import manifest from './manifest.json';

import { detect as detectImport } from './rules/import-statement';
import { detect as detectRequire } from './rules/require-call';

export function createMyLanguagePlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  return {
    // All metadata from manifest.json
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    supportedExtensions: manifest.supportedExtensions,
    defaultExclude: manifest.defaultExclude,
    defaultFilterPatterns: manifest.defaultFilterPatterns,
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

    dispose(): void {
      resolver = null;
    },
  };
}

export default createMyLanguagePlugin;
```

## IPlugin Interface

The full `IPlugin` interface (from `src/core/plugins/types.ts`):

```typescript
interface IPlugin {
  id: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  rules?: IRule[];
  fileColors?: Record<string, string>;
  defaultExclude?: string[];
  defaultFilterPatterns?: string[];

  detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]>;

  initialize?(workspaceRoot: string): Promise<void>;

  /** Called once before per-file detection with all discovered files */
  preAnalyze?(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void>;

  dispose?(): void;
}
```

## Optional Hooks

### preAnalyze

Called once before `detectConnections` runs on individual files. Receives all discovered files for your plugin's extensions. Use this to build workspace-wide indexes needed for cross-file resolution.

Example: The GDScript plugin uses `preAnalyze` to build a `class_name` map so `extends Player` can resolve to the file that declares `class_name Player`.

### initialize / dispose

Called when the plugin is loaded/unloaded. Use for one-time setup and cleanup.

## Registering a Plugin

Built-in plugins are registered in the extension entry point:

```typescript
// src/extension/index.ts
import { PluginRegistry } from '../core/plugins';
import { createTypeScriptPlugin } from '../plugins/typescript';

const registry = new PluginRegistry();
registry.register(createTypeScriptPlugin(), { builtIn: true });
```

## Built-in Plugins

| Plugin | Extensions | Rules |
|--------|-----------|-------|
| [TypeScript](../src/plugins/typescript/) | `.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` | ES6 Imports, Re-exports, Dynamic Imports, CommonJS Require |
| [Python](../src/plugins/python/) | `.py` `.pyi` | Standard Imports, From Imports |
| [C#](../src/plugins/csharp/) | `.cs` | Using Directives, Type Usage |
| [GDScript](../src/plugins/godot/) | `.gd` | Preload, Load, Extends, Class Name Usage |
| [Markdown](../src/plugins/markdown/) | `.md` `.mdx` | Wikilinks |

## Best Practices

1. **Use proper parsers** when available (e.g., TypeScript Compiler API). Fall back to regex for simpler languages.
2. **Set `ruleId`** on every connection so users can toggle individual detection rules.
3. **Keep rule files focused** — one detection pattern per file.
4. **Use `defaultExclude`** for build artifacts and caches that should never appear in the graph.
5. **Test via the plugin interface** — call `createXxxPlugin()` and test `detectConnections()` directly.

## Need Help?

- Check existing plugins in `src/plugins/` — TypeScript is the reference implementation
- Open an issue on GitHub
