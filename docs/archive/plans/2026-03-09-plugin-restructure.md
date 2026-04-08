# Plugin Restructure & Plugins Panel Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure plugins into manifest.json + sources/ folder pattern with per-rule detection logic, fix Plugins panel UI, update docs.

**Architecture:** Each plugin becomes a self-contained folder with a `manifest.json` for static metadata, a `sources/` folder where each file contains one rule's detection logic, a `PathResolver.ts` for shared path resolution, a thin `index.ts` orchestrator, and a short `README.md`. The ImportDetector class is removed — its logic is split across rule files. The IPlugin interface gains a `loadManifest()` pattern where `index.ts` reads manifest.json and wires everything together.

**Tech Stack:** TypeScript, Vitest, React (webview)

---

## Summary of changes

1. Fix Plugins panel UI (toggle switches, spacing, descriptions)
2. Define the rule file interface (`IConnectionDetector`)
3. Restructure TypeScript plugin (reference example)
4. Restructure remaining 4 plugins
5. Update `docs/PLUGINS.md` with new API
6. Verify everything

---

### Task 1: Fix Plugins Panel UI

The current PluginsPanel has broken toggle switches (knob positioning), cramped spacing, and no visible rule descriptions.

**Files:**
- Modify: `src/webview/components/PluginsPanel.tsx`

**Step 1: Fix toggle switches and layout**

The plugin-level toggle knob uses `translate-x-3.5` which doesn't align with the `w-7` track. The rule-level toggle knob uses `translate-x-3` which doesn't align with the `w-6` track. Fix both and add proper spacing and descriptions.

Replace the entire file content with:

```tsx
import React, { useState } from 'react';
import { IPluginStatus } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plugins: IPluginStatus[];
}

/** Reusable toggle switch */
function Toggle({
  checked,
  onChange,
  disabled,
  size = 'md',
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}): React.ReactElement {
  const track = size === 'sm' ? 'w-7 h-[16px]' : 'w-8 h-[18px]';
  const knob = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const translate = size === 'sm'
    ? (checked ? 'translate-x-[13px]' : 'translate-x-[2px]')
    : (checked ? 'translate-x-[15px]' : 'translate-x-[2px]');

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative ${track} rounded-full transition-colors flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' :
        checked ? 'bg-blue-500' : 'bg-zinc-600'
      }`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      <span className={`absolute top-[2px] ${knob} rounded-full bg-white shadow-sm transition-transform ${translate}`} />
    </button>
  );
}

export default function PluginsPanel({ isOpen, onClose, plugins }: PluginsPanelProps): React.ReactElement | null {
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins(prev => {
      const next = new Set(prev);
      if (next.has(pluginId)) next.delete(pluginId);
      else next.add(pluginId);
      return next;
    });
  };

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId, enabled } });
  };

  const handleToggleRule = (qualifiedSourceId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_SOURCE', payload: { qualifiedSourceId, enabled } });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return { color: 'bg-emerald-500', text: 'Active' };
      case 'installed': return { color: 'bg-amber-500', text: 'Installed' };
      default: return { color: 'bg-zinc-500', text: 'Inactive' };
    }
  };

  return (
    <div className="bg-zinc-800/95 backdrop-blur-sm rounded-lg border border-zinc-700 w-72 shadow-lg max-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 flex-shrink-0">
        <span className="text-sm font-medium text-zinc-200">Plugins</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1" title="Close">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Plugin list */}
      <div className="overflow-y-auto flex-1 px-3 pb-3">
        {plugins.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">No plugins registered.</p>
        ) : (
          plugins.map(plugin => {
            const isExpanded = expandedPlugins.has(plugin.id);
            const isInactive = plugin.status === 'inactive';
            const status = statusLabel(plugin.status);

            return (
              <div key={plugin.id} className={`border-b border-zinc-700/50 last:border-b-0 ${isInactive ? 'opacity-50' : ''}`}>
                {/* Plugin header row */}
                <div className="flex items-center gap-2 py-2.5">
                  {/* Chevron */}
                  <button
                    onClick={() => toggleExpanded(plugin.id)}
                    className="text-zinc-400 hover:text-zinc-200 flex-shrink-0"
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Toggle */}
                  <Toggle
                    checked={plugin.enabled}
                    onChange={(v) => handleTogglePlugin(plugin.id, v)}
                    disabled={isInactive}
                  />

                  {/* Name */}
                  <span className="text-xs text-zinc-200 flex-1 truncate font-medium">{plugin.name}</span>

                  {/* Status dot */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.color}`} title={status.text} />

                  {/* Count */}
                  <span className="text-xs text-zinc-500 tabular-nums flex-shrink-0 min-w-[1.5rem] text-right">
                    {plugin.connectionCount}
                  </span>
                </div>

                {/* Expanded: sources list */}
                {isExpanded && (
                  <div className="pb-2 pl-[22px] space-y-1.5">
                    {plugin.sources.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No sources declared.</p>
                    ) : (
                      plugin.sources.map(rule => (
                        <div key={rule.qualifiedSourceId} className="flex items-start gap-2">
                          <div className="pt-0.5">
                            <Toggle
                              checked={rule.enabled}
                              onChange={(v) => handleToggleRule(rule.qualifiedSourceId, v)}
                              disabled={!plugin.enabled}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-xs truncate ${!plugin.enabled ? 'text-zinc-600' : 'text-zinc-300'}`}>
                                {rule.name}
                              </span>
                              <span className={`text-xs tabular-nums flex-shrink-0 ${!plugin.enabled ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                {rule.connectionCount}
                              </span>
                            </div>
                            <p className={`text-[10px] leading-tight ${!plugin.enabled ? 'text-zinc-700' : 'text-zinc-500'}`}>
                              {rule.description}
                            </p>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Supported extensions */}
                    <p className="text-[10px] text-zinc-600 pt-1">
                      {plugin.supportedExtensions.join(' ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck + build**

```bash
npm run typecheck && npm run build
```
Expected: no errors

**Step 3: Verify visually**

Press F5 → open Plugins panel → confirm:
- Toggle switches have proper knob positioning
- Spacing between plugins is even
- Rule descriptions are visible inline below rule names
- Supported extensions shown at bottom of expanded section

**Step 4: Commit**

```bash
git add src/webview/components/PluginsPanel.tsx
git commit -m "fix: plugins panel toggle switches, spacing, and rule descriptions"
```

---

### Task 2: Define IConnectionDetector interface

Add a shared interface for rule files so all plugins follow the same pattern.

**Files:**
- Modify: `src/core/plugins/types.ts`

**Step 1: Add the IConnectionDetector interface**

Add after the `IConnectionSource` interface:

```typescript
/**
 * Interface for a rule detection module.
 * Each rule file in a plugin's sources/ folder exports an object matching this shape.
 *
 * @example
 * ```typescript
 * // plugins/typescript/sources/es6-import.ts
 * export const rule: IConnectionDetector = {
 *   id: 'es6-import',
 *   detect(content, filePath, context) {
 *     // ... detect ES6 imports, return IConnection[]
 *   }
 * };
 * ```
 */
export interface IConnectionDetector<TContext = unknown> {
  /** Rule ID — must match the corresponding entry in manifest.json */
  id: string;

  /**
   * Detect connections for this rule.
   *
   * @param content - File content as string
   * @param filePath - Absolute path to the file
   * @param context - Plugin-specific context (e.g., PathResolver instance)
   * @returns Array of connections. Each MUST have sourceId set to this rule's id.
   */
  detect(
    content: string,
    filePath: string,
    context: TContext
  ): IConnection[];
}
```

**Step 2: Export it from the barrel**

The barrel `src/core/plugins/index.ts` already has `export * from './types'`, so `IConnectionDetector` is automatically exported.

**Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: clean

**Step 4: Commit**

```bash
git add src/core/plugins/types.ts
git commit -m "feat: add IConnectionDetector interface for rule-based plugin structure"
```

---

### Task 3: Restructure TypeScript plugin (reference example)

This is the reference example for all other plugins. Creates manifest.json, splits ImportDetector into 4 rule files, thins out index.ts.

**Files:**
- Create: `src/plugins/typescript/manifest.json`
- Create: `src/plugins/typescript/sources/es6-import.ts`
- Create: `src/plugins/typescript/sources/reexport.ts`
- Create: `src/plugins/typescript/sources/dynamic-import.ts`
- Create: `src/plugins/typescript/sources/commonjs-require.ts`
- Create: `src/plugins/typescript/README.md`
- Modify: `src/plugins/typescript/index.ts` — thin orchestrator
- Delete: `src/plugins/typescript/ImportDetector.ts`

**Step 1: Create manifest.json**

```json
{
  "id": "codegraphy.typescript",
  "name": "TypeScript/JavaScript",
  "version": "1.0.0",
  "supportedExtensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  "defaultExclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/coverage/**",
    "**/.turbo/**"
  ],
  "defaultFilterPatterns": [],
  "fileColors": {
    ".ts": "#3178C6",
    ".tsx": "#61DAFB",
    ".js": "#F7DF1E",
    ".jsx": "#61DAFB",
    ".mjs": "#F7DF1E",
    ".cjs": "#F7DF1E",
    ".vue": "#42B883",
    "tsconfig.json": "#3178C6",
    "jsconfig.json": "#F7DF1E",
    "package.json": "#CB3837",
    "package-lock.json": "#CB3837",
    ".npmrc": "#CB3837",
    ".eslintrc": "#4B32C3",
    ".eslintrc.js": "#4B32C3",
    ".eslintrc.json": "#4B32C3",
    ".eslintrc.cjs": "#4B32C3",
    "eslint.config.js": "#4B32C3",
    "eslint.config.mjs": "#4B32C3",
    ".prettierrc": "#F7B93E",
    ".prettierrc.json": "#F7B93E",
    "prettier.config.js": "#F7B93E",
    "vite.config.ts": "#646CFF",
    "vite.config.js": "#646CFF",
    "webpack.config.js": "#8DD6F9",
    "rollup.config.js": "#FF3333",
    "esbuild.config.js": "#FFCF00",
    "nuxt.config.ts": "#00DC82",
    "nuxt.config.js": "#00DC82",
    "vitest.config.ts": "#729B1B",
    "jest.config.js": "#C21325",
    "**/*.test.ts": "#729B1B",
    "**/*.test.tsx": "#729B1B",
    "**/*.spec.ts": "#729B1B",
    "**/*.spec.tsx": "#729B1B",
    ".gitignore": "#F05032",
    ".gitattributes": "#F05032",
    ".env": "#ECD53F",
    ".env.local": "#ECD53F",
    ".env.development": "#ECD53F",
    ".env.production": "#ECD53F",
    "Dockerfile": "#2496ED",
    "docker-compose.yml": "#2496ED",
    ".md": "#083FA1",
    "README.md": "#083FA1",
    "LICENSE": "#6B7280"
  },
  "sources": [
    { "id": "es6-import", "name": "ES6 Imports", "description": "import/export statements" },
    { "id": "reexport", "name": "Re-exports", "description": "export { x } from \"y\"" },
    { "id": "dynamic-import", "name": "Dynamic Imports", "description": "import(\"module\")" },
    { "id": "commonjs-require", "name": "CommonJS Require", "description": "require(\"module\")" }
  ]
}
```

**Step 2: Create rule files**

Each rule file uses the TypeScript Compiler API directly. The `context` is `{ resolver: PathResolver }`.

`src/plugins/typescript/sources/es6-import.ts`:
```typescript
import * as ts from 'typescript';
import type { IConnection } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

/** Detects ES6 import declarations: import x from 'y', import { a } from 'y' */
export function detect(content: string, filePath: string, ctx: { resolver: PathResolver }): IConnection[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const connections: IConnection[] = [];

  ts.forEachChild(sf, function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      connections.push({
        specifier: node.moduleSpecifier.text,
        resolvedPath: ctx.resolver.resolve(node.moduleSpecifier.text, filePath),
        type: 'static',
        sourceId: 'es6-import',
      });
    }
    ts.forEachChild(node, visit);
  });

  return connections;
}
```

`src/plugins/typescript/sources/reexport.ts`:
```typescript
import * as ts from 'typescript';
import type { IConnection } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

/** Detects re-exports: export { x } from 'y', export * from 'y' */
export function detect(content: string, filePath: string, ctx: { resolver: PathResolver }): IConnection[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const connections: IConnection[] = [];

  ts.forEachChild(sf, function visit(node) {
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      connections.push({
        specifier: node.moduleSpecifier.text,
        resolvedPath: ctx.resolver.resolve(node.moduleSpecifier.text, filePath),
        type: 'reexport',
        sourceId: 'reexport',
      });
    }
    ts.forEachChild(node, visit);
  });

  return connections;
}
```

`src/plugins/typescript/sources/dynamic-import.ts`:
```typescript
import * as ts from 'typescript';
import type { IConnection } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

/** Detects dynamic imports: import('module'), await import('module') */
export function detect(content: string, filePath: string, ctx: { resolver: PathResolver }): IConnection[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const connections: IConnection[] = [];

  ts.forEachChild(sf, function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      connections.push({
        specifier: node.arguments[0].text,
        resolvedPath: ctx.resolver.resolve(node.arguments[0].text, filePath),
        type: 'dynamic',
        sourceId: 'dynamic-import',
      });
    }
    ts.forEachChild(node, visit);
  });

  return connections;
}
```

`src/plugins/typescript/sources/commonjs-require.ts`:
```typescript
import * as ts from 'typescript';
import type { IConnection } from '../../../core/plugins/types';
import type { PathResolver } from '../PathResolver';

/** Detects CommonJS require calls: require('module'), const x = require('y') */
export function detect(content: string, filePath: string, ctx: { resolver: PathResolver }): IConnection[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const connections: IConnection[] = [];

  ts.forEachChild(sf, function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      connections.push({
        specifier: node.arguments[0].text,
        resolvedPath: ctx.resolver.resolve(node.arguments[0].text, filePath),
        type: 'require',
        sourceId: 'commonjs-require',
      });
    }
    ts.forEachChild(node, visit);
  });

  return connections;
}
```

**Step 3: Rewrite index.ts**

The new index.ts loads manifest.json and calls each rule's `detect()`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { IPlugin, IConnection } from '../../core/plugins/types';
import { PathResolver, IPathResolverConfig } from './PathResolver';
import manifest from './manifest.json';
import * as es6Import from './sources/es6-import';
import * as reexport from './sources/reexport';
import * as dynamicImport from './sources/dynamic-import';
import * as commonjsRequire from './sources/commonjs-require';

export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

const sources = [es6Import, reexport, dynamicImport, commonjsRequire];

export function createTypeScriptPlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    supportedExtensions: manifest.supportedExtensions,
    defaultExclude: manifest.defaultExclude,
    defaultFilterPatterns: manifest.defaultFilterPatterns,
    fileColors: manifest.fileColors,
    sources: manifest.sources,

    async initialize(workspaceRoot: string): Promise<void> {
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] TypeScript plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = loadTsConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const ctx = { resolver };
      const connections: IConnection[] = [];
      for (const rule of sources) {
        connections.push(...rule.detect(content, filePath, ctx));
      }
      return connections;
    },

    dispose(): void {
      resolver = null;
    },
  };
}

function loadTsConfig(workspaceRoot: string): IPathResolverConfig {
  const configPaths = [
    path.join(workspaceRoot, 'tsconfig.json'),
    path.join(workspaceRoot, 'jsconfig.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const jsonContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        const config = JSON.parse(jsonContent);
        const compilerOptions = config.compilerOptions || {};
        return {
          baseUrl: compilerOptions.baseUrl,
          paths: compilerOptions.paths,
        };
      }
    } catch (error) {
      console.warn(`[CodeGraphy] Failed to load ${configPath}:`, error);
    }
  }

  return {};
}

export default createTypeScriptPlugin;
```

**Step 4: Delete ImportDetector.ts**

```bash
rm src/plugins/typescript/ImportDetector.ts
```

**Step 5: Create README.md**

```markdown
# TypeScript/JavaScript Plugin

Detects import relationships in TypeScript and JavaScript files using the TypeScript Compiler API for accurate AST-based parsing.

## Supported Extensions

`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs`

## Rules

| Rule | Description |
|------|-------------|
| ES6 Imports | `import x from 'y'`, `import { a } from 'y'` |
| Re-exports | `export { x } from 'y'`, `export * from 'y'` |
| Dynamic Imports | `import('module')`, `await import('module')` |
| CommonJS Require | `require('module')`, `const x = require('y')` |

## Path Resolution

Uses `tsconfig.json` / `jsconfig.json` for:
- Path aliases (`@/components` mapped via `compilerOptions.paths`)
- Base URL resolution (`compilerOptions.baseUrl`)
- Extension inference (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`)
- Index file resolution (`./utils` resolves to `./utils/index.ts`)
```

**Step 6: Update tests**

Tests in `tests/plugins/typescript/` that import from `ImportDetector` directly need updating. Grep for these imports and update them to test sources directly or remove them if they're now covered by the rule-level tests. Existing tests in `tests/plugins/typescript/sourceId.test.ts` should still pass since they test via `createTypeScriptPlugin()`.

For `tests/plugins/typescript/ImportDetector.test.ts`: The ImportDetector class no longer exists. Its test coverage is now handled by the rule files. **Delete this test file** and ensure `sourceId.test.ts` covers the same scenarios. If there are edge-case tests in ImportDetector.test.ts not covered by sourceId.test.ts, add them to sourceId.test.ts.

**Step 7: Add tsconfig resolveJsonModule support**

For `import manifest from './manifest.json'` to work, ensure `tsconfig.json` has `"resolveJsonModule": true`. Check the existing tsconfig — if it already has it, skip. Otherwise add it.

**Step 8: Run tests**

```bash
npm run typecheck && npm test
```
Expected: all pass

**Step 9: Commit**

```bash
git add -A src/plugins/typescript/ tests/plugins/typescript/
git commit -m "refactor: restructure TypeScript plugin to manifest.json + sources/ pattern"
```

---

### Task 4: Restructure Python plugin

Same pattern as TypeScript. Python has 2 sources and a simpler ImportDetector.

**Files:**
- Create: `src/plugins/python/manifest.json`
- Create: `src/plugins/python/sources/standard-import.ts`
- Create: `src/plugins/python/sources/from-import.ts`
- Create: `src/plugins/python/README.md`
- Modify: `src/plugins/python/index.ts`
- Delete: `src/plugins/python/ImportDetector.ts`

**Step 1: Create manifest.json**

Contains: id, name, version, supportedExtensions (`[".py", ".pyi"]`), defaultExclude (the venv/pycache patterns), fileColors, sources (standard-import and from-import).

**Step 2: Create rule files**

The Python ImportDetector uses regex. Split its logic:
- `standard-import.ts` — detects `import module` statements (the `^import\s+` regex branch)
- `from-import.ts` — detects `from module import name` statements (the `^from\s+` regex branch)

Both sources need the multi-line preprocessing logic. Either:
- Put the preprocessor as a shared utility in a `utils.ts` file, OR
- Each rule preprocesses independently (small duplication but simpler)

Recommended: Create `src/plugins/python/preprocess.ts` with the `preprocessMultilineImports` and `createLineMapping` functions extracted from ImportDetector. Both sources import from there.

Context type: `{ resolver: PathResolver }`

**Step 3: Rewrite index.ts to use manifest + sources**

Same pattern as TypeScript.

**Step 4: Delete ImportDetector.ts, update/delete tests, create README.md**

**Step 5: Run tests, commit**

```bash
git commit -m "refactor: restructure Python plugin to manifest.json + sources/ pattern"
```

---

### Task 5: Restructure C# plugin

C# has 2 sources but more complex detection logic (using directives + type usage).

**Files:**
- Create: `src/plugins/csharp/manifest.json`
- Create: `src/plugins/csharp/sources/using-directive.ts`
- Create: `src/plugins/csharp/sources/type-usage.ts`
- Create: `src/plugins/csharp/README.md`
- Modify: `src/plugins/csharp/index.ts`
- Delete: `src/plugins/csharp/ImportDetector.ts`

**Step 1: Create manifest.json**

**Step 2: Create rule files**

C# is trickier because both sources share the ImportDetector's comment-stripping logic and namespace detection. Create `src/plugins/csharp/parser.ts` with:
- `parseUsingsAndNamespaces(content)` — the comment-stripping + using/namespace detection logic extracted from ImportDetector
- `extractUsedTypes(content)` — extracted from current index.ts

Rules:
- `using-directive.ts` — calls `parseUsingsAndNamespaces()`, resolves using directives via PathResolver
- `type-usage.ts` — calls `parseUsingsAndNamespaces()` for namespace info, then resolves intra-namespace type usage

Context type: `{ resolver: PathResolver }`

**Step 3: Rewrite index.ts, delete ImportDetector.ts, create README.md**

**Step 4: Run tests, commit**

```bash
git commit -m "refactor: restructure C# plugin to manifest.json + sources/ pattern"
```

---

### Task 6: Restructure GDScript plugin

GDScript has 4 sources and a class-based ImportDetector with preAnalyze.

**Files:**
- Create: `src/plugins/godot/manifest.json`
- Create: `src/plugins/godot/sources/preload.ts`
- Create: `src/plugins/godot/sources/load.ts`
- Create: `src/plugins/godot/sources/extends.ts`
- Create: `src/plugins/godot/sources/class-name-usage.ts`
- Create: `src/plugins/godot/README.md`
- Modify: `src/plugins/godot/index.ts`
- Delete: `src/plugins/godot/ImportDetector.ts`

**Step 1: Create manifest.json**

Note: GDScript has `defaultFilterPatterns: ["**/*.uid"]`.

**Step 2: Create rule files**

Each rule is self-contained regex detection:
- `preload.ts` — matches `preload("res://...")` pattern
- `load.ts` — matches `load("res://...")` with negative lookbehind for `preload`
- `extends.ts` — matches `extends "res://..."` (quoted path extends)
- `class-name-usage.ts` — matches class name patterns (extends ClassName, type annotations, static calls, etc.)

Context type: `{ resolver: GDScriptPathResolver; workspaceRoot: string }`

The GDScript plugin has `preAnalyze` and class_name registration logic. This stays in index.ts since it's plugin-level orchestration, not per-rule.

**Step 3: Rewrite index.ts**

GDScript index.ts keeps:
- `preAnalyze()` for building the class_name map
- class_name declaration detection (in detectConnections, before calling sources)
- Calls each rule's `detect()` and concatenates results

**Step 4: Delete ImportDetector.ts, update tests, create README.md**

**Step 5: Run tests, commit**

```bash
git commit -m "refactor: restructure GDScript plugin to manifest.json + sources/ pattern"
```

---

### Task 7: Restructure Markdown plugin

Simplest plugin — 1 rule.

**Files:**
- Create: `src/plugins/markdown/manifest.json`
- Create: `src/plugins/markdown/sources/wikilink.ts`
- Create: `src/plugins/markdown/README.md`
- Modify: `src/plugins/markdown/index.ts`
- Delete: `src/plugins/markdown/ImportDetector.ts`

**Step 1: Create manifest.json**

**Step 2: Create wikilink.ts rule**

Moves the wikilink regex detection from ImportDetector into the rule file. Context type: `{ resolver: PathResolver; sourceFile: string }`.

**Step 3: Rewrite index.ts**

Keeps `preAnalyze()` for building the file index. Calls wikilink rule's `detect()`.

**Step 4: Delete ImportDetector.ts, update tests, create README.md**

**Step 5: Run tests, commit**

```bash
git commit -m "refactor: restructure Markdown plugin to manifest.json + sources/ pattern"
```

---

### Task 8: Update docs/PLUGINS.md

Rewrite the plugin development guide to reflect the new structure.

**Files:**
- Modify: `docs/PLUGINS.md`

**Step 1: Rewrite PLUGINS.md**

The doc should cover:
1. Overview — what plugins do
2. Plugin structure — manifest.json + sources/ + PathResolver + index.ts
3. manifest.json format — all fields with descriptions
4. Rule file format — the `detect()` function signature, what it returns
5. index.ts orchestrator — how it loads manifest and calls sources
6. IPlugin interface — current full interface (including `sources`, `sourceId` on IConnection)
7. IConnection interface — with the new `sourceId` field
8. Registration — how built-in plugins are registered
9. Reference — point to TypeScript plugin as the canonical example

Remove the outdated example code (old PythonPlugin class, old ILanguagePlugin references). Keep it practical — show real code from the TypeScript plugin.

**Step 2: Commit**

```bash
git add docs/PLUGINS.md
git commit -m "docs: update plugin development guide for manifest.json + sources/ structure"
```

---

### Task 9: Final verification

**Step 1: Full test suite**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
Expected: all pass, no new lint errors

**Step 2: Manual F5 test**

- Open Plugins panel → verify all 5 plugins show with correct sources, counts, descriptions
- Toggle a rule off → connections from that rule disappear instantly
- Toggle back on → connections reappear
- Toggle entire plugin off → all connections disappear
- Toggle plugin back on → per-rule state restored
- Close & reopen VS Code → disabled state persists

**Step 3: Final commit if any cleanup needed**

```bash
git commit -m "chore: final cleanup after plugin restructure"
```
