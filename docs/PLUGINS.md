# Plugin Development Guide

This guide explains how to create language plugins for CodeGraphy.

## Overview

CodeGraphy uses a plugin system to support different programming languages. Each plugin is responsible for:

1. Declaring which file extensions it supports
2. Detecting connections (imports/dependencies) in source files
3. Optionally providing initialization and cleanup logic

## Plugin Interface

All plugins must implement the `ILanguagePlugin` interface:

```typescript
interface ILanguagePlugin {
  /** Unique identifier for the plugin */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** File extensions this plugin handles (e.g., ['.ts', '.tsx']) */
  extensions: string[];
  
  /** 
   * Detect connections in a source file.
   * @param filePath - Workspace-relative path to the file
   * @param content - File contents as string
   * @returns Array of detected connections
   */
  detectConnections(filePath: string, content: string): IDetectedConnection[];
  
  /** Optional: Called once when the plugin is registered */
  initialize?(): Promise<void>;
  
  /** Optional: Called when the plugin is unregistered */
  dispose?(): void;
}
```

## Connection Interface

The `detectConnections` method returns an array of connections:

```typescript
interface IDetectedConnection {
  /** The import path as written in the source (e.g., './utils', '@/components') */
  importPath: string;
  
  /** Type of import */
  type: 'static' | 'dynamic' | 'require';
  
  /** Line number where the import appears (1-indexed) */
  line: number;
}
```

## Example: Creating a Python Plugin

Here's a complete example of a Python import plugin:

```typescript
// src/plugins/python/index.ts
import type { ILanguagePlugin, IDetectedConnection } from '../../core/plugins/types';

export class PythonPlugin implements ILanguagePlugin {
  id = 'codegraphy.python';
  name = 'Python';
  extensions = ['.py'];

  detectConnections(filePath: string, content: string): IDetectedConnection[] {
    const connections: IDetectedConnection[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Match: import module
      const importMatch = line.match(/^import\s+([\w.]+)/);
      if (importMatch) {
        connections.push({
          importPath: importMatch[1],
          type: 'static',
          line: lineNumber,
        });
        continue;
      }

      // Match: from module import ...
      const fromMatch = line.match(/^from\s+([\w.]+)\s+import/);
      if (fromMatch) {
        connections.push({
          importPath: fromMatch[1],
          type: 'static',
          line: lineNumber,
        });
      }
    }

    return connections;
  }
}

export function createPlugin(): ILanguagePlugin {
  return new PythonPlugin();
}
```

## Registering a Plugin

### Built-in Plugins

Built-in plugins are registered in the extension entry point:

```typescript
// src/extension/index.ts
import { PluginRegistry } from '../core/plugins';
import { TypeScriptPlugin } from '../plugins/typescript';

const registry = new PluginRegistry();
registry.register(new TypeScriptPlugin(), { builtIn: true });
```

### External Plugins (Future)

External plugins will be loaded from configured paths:

```json
// .vscode/settings.json
{
  "codegraphy.plugins": [
    "./my-custom-plugin.js"
  ]
}
```

## Path Resolution

Your plugin's `detectConnections` returns raw import paths. CodeGraphy handles path resolution separately, but you can provide hints:

- **Relative paths** (`./`, `../`): Resolved relative to the importing file
- **Absolute paths** (`/src/`): Resolved from workspace root
- **Aliases** (`@/`, `~/`): Resolved using tsconfig.json paths (TypeScript plugin)
- **Package imports** (`lodash`): Currently filtered out (node_modules)

## Best Practices

### 1. Handle Edge Cases
```typescript
detectConnections(filePath: string, content: string): IDetectedConnection[] {
  // Handle empty files
  if (!content.trim()) {
    return [];
  }
  
  // Handle binary files or encoding issues
  try {
    // Your parsing logic
  } catch (error) {
    console.warn(`[MyPlugin] Failed to parse ${filePath}:`, error);
    return [];
  }
}
```

### 2. Use Proper Parsers
For accurate results, use language-specific parsers instead of regex:

- **TypeScript/JavaScript**: `ts.createSourceFile()`
- **Python**: Consider `tree-sitter-python`
- **Go**: Consider `tree-sitter-go`
- **Rust**: Consider `tree-sitter-rust`

### 3. Keep It Fast
Plugins are called for every file on every analysis:

- Avoid synchronous I/O operations
- Cache parsed ASTs if reusing
- Skip files early if obviously not relevant

### 4. Test Thoroughly
```typescript
describe('PythonPlugin', () => {
  const plugin = new PythonPlugin();

  it('should detect import statements', () => {
    const content = `import os\nimport sys`;
    const connections = plugin.detectConnections('test.py', content);
    
    expect(connections).toHaveLength(2);
    expect(connections[0].importPath).toBe('os');
  });

  it('should detect from imports', () => {
    const content = `from pathlib import Path`;
    const connections = plugin.detectConnections('test.py', content);
    
    expect(connections[0].importPath).toBe('pathlib');
  });

  it('should handle empty files', () => {
    const connections = plugin.detectConnections('empty.py', '');
    expect(connections).toHaveLength(0);
  });
});
```

## TypeScript Plugin Reference

The built-in TypeScript plugin (`src/plugins/typescript/`) is a good reference:

| File | Purpose |
|------|---------|
| `index.ts` | Plugin definition, coordinates components |
| `ImportDetector.ts` | Parses imports using TS compiler API |
| `PathResolver.ts` | Resolves import paths to actual files |

Key features:
- Handles ES6 imports, dynamic imports, and `require()`
- Resolves path aliases from `tsconfig.json`
- Supports `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`

## Future: Plugin Manifest

We're planning a manifest format for external plugins:

```json
{
  "name": "codegraphy-python",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "codegraphy": {
    "pluginId": "python",
    "displayName": "Python",
    "extensions": [".py"],
    "activationEvents": ["onLanguage:python"]
  }
}
```

## Need Help?

- Check existing plugins in `src/plugins/`
- Open an issue on GitHub
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
