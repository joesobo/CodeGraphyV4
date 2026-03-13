# TypeScript Plugin Refactoring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the TypeScript plugin to meet mutation score ≥ 80%, ≤ 50 mutation sites per file, and file-per-module test structure.

**Architecture:** Extract shared helpers (`getScriptKind`, `tsconfig`, `builtins`, `fileResolver`) from bloated source files. Create per-module test files for every source module and all 4 rules. Iteratively kill mutation survivors.

**Tech Stack:** TypeScript, Vitest, Stryker (mutation testing), istanbul (coverage/CRAP)

**Spec:** `docs/superpowers/specs/2026-03-13-typescript-plugin-refactor-design.md`

**Baselines:**
- Mutation score: 39.65% (target ≥ 80%)
- PathResolver.ts: 145 mutation sites (target ≤ 50)
- index.ts: 66 mutation sites (target ≤ 50)
- Tests: 30 across 3 files
- CRAP: all ≤ 8 (already passing)

**Commands:**
```bash
# Run TS plugin tests only
pnpm --filter @codegraphy/plugin-typescript exec vitest run

# Run CRAP check
pnpm run crap -- plugin-typescript

# Run mutation testing
pnpm run mutate -- plugin-typescript

# Lint + typecheck
pnpm run lint && pnpm run typecheck
```

---

## Chunk 1: Extract Shared Utilities and Split Source Files

### Task 1: Extract `getScriptKind.ts`

This function is duplicated identically in all 4 rule files. Extract to a shared module.

**Files:**
- Create: `packages/plugin-typescript/src/getScriptKind.ts`
- Create: `packages/plugin-typescript/__tests__/getScriptKind.test.ts`
- Modify: `packages/plugin-typescript/src/rules/es6-import.ts`
- Modify: `packages/plugin-typescript/src/rules/dynamic-import.ts`
- Modify: `packages/plugin-typescript/src/rules/commonjs-require.ts`
- Modify: `packages/plugin-typescript/src/rules/reexport.ts`

- [ ] **Step 1: Write the failing test for getScriptKind**

```typescript
// packages/plugin-typescript/__tests__/getScriptKind.test.ts
import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { getScriptKind } from '../src/getScriptKind';

describe('getScriptKind', () => {
  it('should return TSX for .tsx files', () => {
    expect(getScriptKind('Component.tsx')).toBe(ts.ScriptKind.TSX);
  });

  it('should return TS for .ts files', () => {
    expect(getScriptKind('module.ts')).toBe(ts.ScriptKind.TS);
  });

  it('should return JSX for .jsx files', () => {
    expect(getScriptKind('Component.jsx')).toBe(ts.ScriptKind.JSX);
  });

  it('should return JS for .js files', () => {
    expect(getScriptKind('module.js')).toBe(ts.ScriptKind.JS);
  });

  it('should return JS for .mjs files', () => {
    expect(getScriptKind('module.mjs')).toBe(ts.ScriptKind.JS);
  });

  it('should return JS for .cjs files', () => {
    expect(getScriptKind('module.cjs')).toBe(ts.ScriptKind.JS);
  });

  it('should default to TS for unknown extensions', () => {
    expect(getScriptKind('file.unknown')).toBe(ts.ScriptKind.TS);
  });

  it('should handle uppercase extensions', () => {
    expect(getScriptKind('file.TSX')).toBe(ts.ScriptKind.TSX);
  });

  it('should handle paths with directories', () => {
    expect(getScriptKind('/some/path/to/file.tsx')).toBe(ts.ScriptKind.TSX);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/getScriptKind.test.ts`
Expected: FAIL — module `../src/getScriptKind` not found

- [ ] **Step 3: Create the getScriptKind module**

```typescript
// packages/plugin-typescript/src/getScriptKind.ts
import * as ts from 'typescript';

export function getScriptKind(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.tsx': return ts.ScriptKind.TSX;
    case '.ts': return ts.ScriptKind.TS;
    case '.jsx': return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs': return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/getScriptKind.test.ts`
Expected: PASS (all 9 tests)

- [ ] **Step 5: Update all 4 rule files to import from shared module**

In each rule file (`es6-import.ts`, `dynamic-import.ts`, `commonjs-require.ts`, `reexport.ts`):
- Add: `import { getScriptKind } from '../getScriptKind';`
- Remove: the local `getScriptKind` function (lines 16-27 in each)

- [ ] **Step 6: Run all plugin tests to verify no regressions**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-typescript/src/getScriptKind.ts packages/plugin-typescript/__tests__/getScriptKind.test.ts packages/plugin-typescript/src/rules/
git commit -m "refactor(typescript): extract shared getScriptKind utility"
```

---

### Task 2: Extract `TsRuleContext` type

The `TsRuleContext` interface is duplicated in all 4 rule files. Extract to a shared types file.

**Files:**
- Create: `packages/plugin-typescript/src/types.ts`
- Modify: `packages/plugin-typescript/src/rules/es6-import.ts`
- Modify: `packages/plugin-typescript/src/rules/dynamic-import.ts`
- Modify: `packages/plugin-typescript/src/rules/commonjs-require.ts`
- Modify: `packages/plugin-typescript/src/rules/reexport.ts`

- [ ] **Step 1: Create the types module**

```typescript
// packages/plugin-typescript/src/types.ts
import type { PathResolver } from './PathResolver';

/** Context provided by the TypeScript plugin orchestrator to each rule */
export interface TsRuleContext {
  resolver: PathResolver;
}
```

- [ ] **Step 2: Update all 4 rule files to import TsRuleContext**

In each rule file:
- Add: `import type { TsRuleContext } from '../types';`
- Remove: the local `interface TsRuleContext { ... }` block
- Remove: `import type { PathResolver } from '../PathResolver';` (no longer needed directly)

- [ ] **Step 3: Run all plugin tests**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/plugin-typescript/src/types.ts packages/plugin-typescript/src/rules/
git commit -m "refactor(typescript): extract shared TsRuleContext type"
```

---

### Task 3: Extract `tsconfig.ts` from `index.ts`

Move the tsconfig loading and parsing helpers out of the orchestrator to reduce index.ts mutation sites from 66 to ~25.

**Files:**
- Create: `packages/plugin-typescript/src/tsconfig.ts`
- Create: `packages/plugin-typescript/__tests__/tsconfig.test.ts`
- Modify: `packages/plugin-typescript/src/index.ts`

- [ ] **Step 1: Write the failing tests for tsconfig helpers**

```typescript
// packages/plugin-typescript/__tests__/tsconfig.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadTsConfig, isRecord, getCompilerOptions, getBaseUrl, getPaths } from '../src/tsconfig';

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({ key: 'value' })).toBe(true);
  });

  it('should return true for empty objects', () => {
    expect(isRecord({})).toBe(true);
  });

  it('should return false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('should return true for arrays (callers handle array checks separately)', () => {
    expect(isRecord([1, 2, 3])).toBe(true);
  });

  it('should return false for strings', () => {
    expect(isRecord('hello')).toBe(false);
  });

  it('should return false for numbers', () => {
    expect(isRecord(42)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });
});

describe('getCompilerOptions', () => {
  it('should extract compilerOptions from config', () => {
    const config = { compilerOptions: { target: 'ES2020' } };
    expect(getCompilerOptions(config)).toEqual({ target: 'ES2020' });
  });

  it('should return empty object when compilerOptions is missing', () => {
    expect(getCompilerOptions({})).toEqual({});
  });

  it('should return empty object for non-record config', () => {
    expect(getCompilerOptions(null)).toEqual({});
  });

  it('should return empty object when compilerOptions is not a record', () => {
    expect(getCompilerOptions({ compilerOptions: 'invalid' })).toEqual({});
  });
});

describe('getBaseUrl', () => {
  it('should return baseUrl string', () => {
    expect(getBaseUrl({ baseUrl: '.' })).toBe('.');
  });

  it('should return undefined when baseUrl is missing', () => {
    expect(getBaseUrl({})).toBeUndefined();
  });

  it('should return undefined when baseUrl is not a string', () => {
    expect(getBaseUrl({ baseUrl: 42 })).toBeUndefined();
  });
});

describe('getPaths', () => {
  it('should return valid paths mapping', () => {
    const compilerOptions = { paths: { '@/*': ['src/*'] } };
    expect(getPaths(compilerOptions)).toEqual({ '@/*': ['src/*'] });
  });

  it('should return undefined when paths is missing', () => {
    expect(getPaths({})).toBeUndefined();
  });

  it('should return undefined when paths is not a record', () => {
    expect(getPaths({ paths: 'invalid' })).toBeUndefined();
  });

  it('should return undefined when path targets are not arrays', () => {
    expect(getPaths({ paths: { '@/*': 'src/*' } })).toBeUndefined();
  });

  it('should return undefined when array items are not strings', () => {
    expect(getPaths({ paths: { '@/*': [42] } })).toBeUndefined();
  });

  it('should handle multiple path aliases', () => {
    const compilerOptions = {
      paths: { '@/*': ['src/*'], '#/*': ['lib/*'] },
    };
    expect(getPaths(compilerOptions)).toEqual({
      '@/*': ['src/*'],
      '#/*': ['lib/*'],
    });
  });
});

describe('loadTsConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsconfig-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load tsconfig.json with baseUrl and paths', () => {
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('.');
    expect(config.paths).toEqual({ '@/*': ['src/*'] });
  });

  it('should load jsconfig.json when tsconfig.json is absent', () => {
    fs.writeFileSync(
      path.join(tempDir, 'jsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: 'src' },
      })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('src');
  });

  it('should prefer tsconfig.json over jsconfig.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.' } })
    );
    fs.writeFileSync(
      path.join(tempDir, 'jsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: 'src' } })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('.');
  });

  it('should return empty config when no config file exists', () => {
    const config = loadTsConfig(tempDir);

    expect(config).toEqual({});
  });

  it('should return empty config for malformed tsconfig', () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ invalid json }}}');

    const config = loadTsConfig(tempDir);

    expect(config).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/tsconfig.test.ts`
Expected: FAIL — module `../src/tsconfig` not found

- [ ] **Step 3: Create tsconfig.ts by moving functions from index.ts**

```typescript
// packages/plugin-typescript/src/tsconfig.ts
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { IPathResolverConfig } from './PathResolver';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getCompilerOptions(config: unknown): Record<string, unknown> {
  if (!isRecord(config)) return {};
  const compilerOptions = config.compilerOptions;
  return isRecord(compilerOptions) ? compilerOptions : {};
}

export function getBaseUrl(compilerOptions: Record<string, unknown>): string | undefined {
  const baseUrl = compilerOptions.baseUrl;
  return typeof baseUrl === 'string' ? baseUrl : undefined;
}

export function getPaths(
  compilerOptions: Record<string, unknown>
): Record<string, string[]> | undefined {
  const paths = compilerOptions.paths;
  if (!isRecord(paths)) return undefined;

  const entries: Array<[string, string[]]> = [];

  for (const [alias, targetValue] of Object.entries(paths)) {
    if (!Array.isArray(targetValue)) return undefined;
    if (!targetValue.every((item) => typeof item === 'string')) return undefined;
    entries.push([alias, targetValue]);
  }

  return Object.fromEntries(entries);
}

export function loadTsConfig(workspaceRoot: string): IPathResolverConfig {
  const configPaths = [
    path.join(workspaceRoot, 'tsconfig.json'),
    path.join(workspaceRoot, 'jsconfig.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = ts.parseConfigFileTextToJson(configPath, content);
        if (parsed.error) {
          const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
          throw new Error(message);
        }

        const compilerOptions = getCompilerOptions(parsed.config);

        return {
          baseUrl: getBaseUrl(compilerOptions),
          paths: getPaths(compilerOptions),
        };
      }
    } catch (error) {
      console.warn(`[CodeGraphy] Failed to load ${configPath}:`, error);
    }
  }

  return {};
}
```

- [ ] **Step 4: Update index.ts to import from tsconfig.ts**

Remove: `loadTsConfig`, `isRecord`, `getCompilerOptions`, `getBaseUrl`, `getPaths` functions from `index.ts`.
Add: `import { loadTsConfig } from './tsconfig';`
Remove: `import * as ts from 'typescript';` (no longer needed in index.ts)

The updated `index.ts` should be approximately:
```typescript
import * as path from 'path';
import type { IPlugin, IConnection } from '@codegraphy/plugin-api';
import { PathResolver, IPathResolverConfig } from './PathResolver';
import { loadTsConfig } from './tsconfig';
import manifest from '../codegraphy.json';

import { detect as detectEs6Import } from './rules/es6-import';
import { detect as detectReexport } from './rules/reexport';
import { detect as detectDynamicImport } from './rules/dynamic-import';
import { detect as detectCommonjsRequire } from './rules/commonjs-require';

export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

export function createTypeScriptPlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    rules: manifest.rules,
    fileColors: manifest.fileColors,
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

      return [
        ...detectEs6Import(content, filePath, ctx),
        ...detectReexport(content, filePath, ctx),
        ...detectDynamicImport(content, filePath, ctx),
        ...detectCommonjsRequire(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
    },
  };
}

export default createTypeScriptPlugin;
```

- [ ] **Step 5: Run all tests**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-typescript/src/tsconfig.ts packages/plugin-typescript/__tests__/tsconfig.test.ts packages/plugin-typescript/src/index.ts
git commit -m "refactor(typescript): extract tsconfig helpers from index.ts"
```

---

### Task 4: Extract `builtins.ts` from PathResolver

Extract built-in module detection and bare specifier checks to reduce PathResolver.ts mutation sites.

**Files:**
- Create: `packages/plugin-typescript/src/builtins.ts`
- Create: `packages/plugin-typescript/__tests__/builtins.test.ts`
- Modify: `packages/plugin-typescript/src/PathResolver.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/plugin-typescript/__tests__/builtins.test.ts
import { describe, it, expect } from 'vitest';
import { isBuiltIn, isBareSpecifier } from '../src/builtins';

describe('isBuiltIn', () => {
  it('should recognize fs as built-in', () => {
    expect(isBuiltIn('fs')).toBe(true);
  });

  it('should recognize path as built-in', () => {
    expect(isBuiltIn('path')).toBe(true);
  });

  it('should recognize node: prefixed built-ins', () => {
    expect(isBuiltIn('node:fs')).toBe(true);
    expect(isBuiltIn('node:path')).toBe(true);
  });

  it('should recognize subpath of built-in', () => {
    expect(isBuiltIn('fs/promises')).toBe(true);
  });

  it('should not recognize npm packages as built-in', () => {
    expect(isBuiltIn('express')).toBe(false);
    expect(isBuiltIn('lodash')).toBe(false);
  });

  it('should not recognize relative paths as built-in', () => {
    expect(isBuiltIn('./utils')).toBe(false);
  });

  it('should recognize all standard Node.js built-ins', () => {
    const expectedBuiltins = [
      'os', 'crypto', 'http', 'https', 'url', 'util',
      'stream', 'events', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
      'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
      'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
    ];
    for (const builtin of expectedBuiltins) {
      expect(isBuiltIn(builtin)).toBe(true);
    }
  });
});

describe('isBareSpecifier', () => {
  it('should return true for simple package names', () => {
    expect(isBareSpecifier('react')).toBe(true);
    expect(isBareSpecifier('lodash')).toBe(true);
  });

  it('should return true for scoped packages', () => {
    expect(isBareSpecifier('@types/node')).toBe(true);
    expect(isBareSpecifier('@mui/material')).toBe(true);
  });

  it('should return true for packages with subpaths', () => {
    expect(isBareSpecifier('lodash/merge')).toBe(true);
  });

  it('should return false for relative paths', () => {
    expect(isBareSpecifier('./utils')).toBe(false);
    expect(isBareSpecifier('../helpers')).toBe(false);
  });

  it('should return false for absolute paths', () => {
    expect(isBareSpecifier('/absolute/path')).toBe(false);
  });

  it('should return true for packages with hyphens', () => {
    expect(isBareSpecifier('my-package')).toBe(true);
    expect(isBareSpecifier('@my-scope/my-package')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/builtins.test.ts`
Expected: FAIL — module `../src/builtins` not found

- [ ] **Step 3: Create builtins.ts**

```typescript
// packages/plugin-typescript/src/builtins.ts
const BUILTIN_MODULES = new Set([
  'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
  'stream', 'events', 'buffer', 'child_process', 'cluster',
  'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
  'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
  'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
]);

export function isBuiltIn(specifier: string): boolean {
  const base = specifier.startsWith('node:')
    ? specifier.slice(5)
    : specifier;

  return BUILTIN_MODULES.has(base.split('/')[0]);
}

export function isBareSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return false;
  }
  return /^(@[\w-]+\/)?[\w-]/.test(specifier);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/builtins.test.ts`
Expected: PASS

- [ ] **Step 5: Update PathResolver.ts to import from builtins.ts**

Remove: `_isBuiltIn()` method and `_isBareSpecifier()` method from PathResolver class.
Add: `import { isBuiltIn, isBareSpecifier } from './builtins';`
Update: `resolve()` method to call `isBuiltIn(specifier)` and `isBareSpecifier(specifier)` instead of `this._isBuiltIn()` and `this._isBareSpecifier()`.

- [ ] **Step 6: Run all tests**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-typescript/src/builtins.ts packages/plugin-typescript/__tests__/builtins.test.ts packages/plugin-typescript/src/PathResolver.ts
git commit -m "refactor(typescript): extract builtins detection from PathResolver"
```

---

### Task 5: Extract `fileResolver.ts` from PathResolver

Extract file existence checking and extension resolution to reduce PathResolver.ts mutation sites further.

**Files:**
- Create: `packages/plugin-typescript/src/fileResolver.ts`
- Create: `packages/plugin-typescript/__tests__/fileResolver.test.ts`
- Modify: `packages/plugin-typescript/src/PathResolver.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/plugin-typescript/__tests__/fileResolver.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveFile, fileExists } from '../src/fileResolver';

describe('fileExists', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileresolver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return true for existing files', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(filePath, '');

    expect(fileExists(filePath)).toBe(true);
  });

  it('should return false for non-existent files', () => {
    expect(fileExists(path.join(tempDir, 'missing.ts'))).toBe(false);
  });

  it('should return false for directories', () => {
    const dirPath = path.join(tempDir, 'subdir');
    fs.mkdirSync(dirPath);

    expect(fileExists(dirPath)).toBe(false);
  });
});

describe('resolveFile', () => {
  let tempDir: string;

  function createFile(relativePath: string): string {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '');
    return fullPath;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileresolver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return path when file already has extension', () => {
    const filePath = createFile('utils.ts');

    expect(resolveFile(filePath)).toBe(filePath);
  });

  it('should resolve by adding .ts extension', () => {
    const filePath = createFile('utils.ts');
    const basePath = path.join(tempDir, 'utils');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .tsx extension', () => {
    const filePath = createFile('Component.tsx');
    const basePath = path.join(tempDir, 'Component');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .js extension', () => {
    const filePath = createFile('helper.js');
    const basePath = path.join(tempDir, 'helper');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .jsx extension', () => {
    const filePath = createFile('Widget.jsx');
    const basePath = path.join(tempDir, 'Widget');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .mjs extension', () => {
    const filePath = createFile('esm.mjs');
    const basePath = path.join(tempDir, 'esm');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .cjs extension', () => {
    const filePath = createFile('cjs.cjs');
    const basePath = path.join(tempDir, 'cjs');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should resolve by adding .json extension', () => {
    const filePath = createFile('data.json');
    const basePath = path.join(tempDir, 'data');

    expect(resolveFile(basePath)).toBe(filePath);
  });

  it('should prefer .ts over .js when both exist', () => {
    const tsFile = createFile('utils.ts');
    createFile('utils.js');
    const basePath = path.join(tempDir, 'utils');

    expect(resolveFile(basePath)).toBe(tsFile);
  });

  it('should resolve directory index.ts', () => {
    const indexFile = createFile('utils/index.ts');
    const basePath = path.join(tempDir, 'utils');

    expect(resolveFile(basePath)).toBe(indexFile);
  });

  it('should resolve directory index.tsx', () => {
    const indexFile = createFile('components/index.tsx');
    const basePath = path.join(tempDir, 'components');

    expect(resolveFile(basePath)).toBe(indexFile);
  });

  it('should resolve directory index.js', () => {
    const indexFile = createFile('lib/index.js');
    const basePath = path.join(tempDir, 'lib');

    expect(resolveFile(basePath)).toBe(indexFile);
  });

  it('should resolve directory index.jsx', () => {
    const indexFile = createFile('widgets/index.jsx');
    const basePath = path.join(tempDir, 'widgets');

    expect(resolveFile(basePath)).toBe(indexFile);
  });

  it('should return null when nothing resolves', () => {
    const basePath = path.join(tempDir, 'nonexistent');

    expect(resolveFile(basePath)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/fileResolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Create fileResolver.ts**

```typescript
// packages/plugin-typescript/src/fileResolver.ts
import * as fs from 'fs';
import * as path from 'path';

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

export function fileExists(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export function resolveFile(basePath: string): string | null {
  if (fileExists(basePath)) {
    return basePath;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    const withExt = basePath + ext;
    if (fileExists(withExt)) {
      return withExt;
    }
  }

  for (const indexFile of INDEX_FILES) {
    const indexPath = path.join(basePath, indexFile);
    if (fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/fileResolver.test.ts`
Expected: PASS

- [ ] **Step 5: Update PathResolver.ts to import from fileResolver.ts**

Remove: `_resolveFile()` and `_fileExists()` methods, plus `RESOLVE_EXTENSIONS` and `INDEX_FILES` constants.
Add: `import { resolveFile } from './fileResolver';`
Replace: all calls to `this._resolveFile(...)` with `resolveFile(...)`.
Remove: `import * as fs from 'fs';` (no longer needed).

The updated PathResolver.ts should be approximately:
```typescript
import * as path from 'path';
import { isBuiltIn, isBareSpecifier } from './builtins';
import { resolveFile } from './fileResolver';

export interface IPathResolverConfig {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export class PathResolver {
  private readonly _config: IPathResolverConfig;
  private readonly _baseUrl: string;

  constructor(workspaceRoot: string, config: IPathResolverConfig = {}) {
    this._config = config;
    this._baseUrl = config.baseUrl
      ? path.resolve(workspaceRoot, config.baseUrl)
      : workspaceRoot;
  }

  resolve(specifier: string, fromFile: string): string | null {
    if (isBuiltIn(specifier)) {
      return null;
    }

    if (specifier.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, specifier);
      return resolveFile(resolved);
    }

    const pathsResolved = this._resolveWithPaths(specifier);
    if (pathsResolved) {
      return pathsResolved;
    }

    if (this._config.baseUrl) {
      const resolved = path.resolve(this._baseUrl, specifier);
      const result = resolveFile(resolved);
      if (result) {
        return result;
      }
    }

    if (isBareSpecifier(specifier)) {
      return null;
    }

    return null;
  }

  private _resolveWithPaths(specifier: string): string | null {
    const { paths } = this._config;
    if (!paths) return null;

    for (const [pattern, targets] of Object.entries(paths)) {
      const match = this._matchPathPattern(specifier, pattern);
      if (match !== null) {
        for (const target of targets) {
          const resolvedTarget = target.replace('*', match);
          const fullPath = path.resolve(this._baseUrl, resolvedTarget);
          const resolved = resolveFile(fullPath);
          if (resolved) {
            return resolved;
          }
        }
      }
    }

    return null;
  }

  private _matchPathPattern(specifier: string, pattern: string): string | null {
    if (pattern.includes('*')) {
      const [prefix, suffix] = pattern.split('*');
      if (specifier.startsWith(prefix) && specifier.endsWith(suffix || '')) {
        return specifier.slice(prefix.length, suffix ? -suffix.length || undefined : undefined);
      }
    } else if (specifier === pattern) {
      return '';
    }
    return null;
  }
}
```

- [ ] **Step 6: Run all tests**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-typescript/src/fileResolver.ts packages/plugin-typescript/__tests__/fileResolver.test.ts packages/plugin-typescript/src/PathResolver.ts
git commit -m "refactor(typescript): extract fileResolver from PathResolver"
```

---

### Task 6: Verify mutation site counts after source splits

**Files:** None (verification only)

- [ ] **Step 1: Run mutation testing to verify site counts**

Run: `pnpm run mutate -- plugin-typescript`

Expected: All files should now have ≤ 50 mutation sites:
- `PathResolver.ts` — should be ~40-50 (was 145)
- `index.ts` — should be ~20-25 (was 66)
- `builtins.ts` — should be ~20-30
- `fileResolver.ts` — should be ~30-40
- `tsconfig.ts` — should be ~40-50
- `getScriptKind.ts` — should be ~10-15
- Rule files — unchanged (~29-39 each)

If any file still exceeds 50, note which and plan further splits in Chunk 3.

- [ ] **Step 2: Commit checkpoint**

```bash
git add -A && git commit -m "chore(typescript): verify mutation site counts after source refactoring"
```

---

## Chunk 2: Restructure Test Files and Add Per-Rule Tests

### Task 7: Rename `Integration.test.ts` to `index.test.ts` and add manifest tests

**Files:**
- Rename: `packages/plugin-typescript/__tests__/Integration.test.ts` → `packages/plugin-typescript/__tests__/index.test.ts`
- Delete: `packages/plugin-typescript/__tests__/ruleId.test.ts`
- Modify: `packages/plugin-typescript/__tests__/index.test.ts`

- [ ] **Step 1: Rename Integration.test.ts to index.test.ts**

```bash
cd packages/plugin-typescript
git mv __tests__/Integration.test.ts __tests__/index.test.ts
```

- [ ] **Step 2: Add manifest tests to index.test.ts**

Add a new describe block at the top of `index.test.ts` for manifest metadata, following the Godot pattern:

```typescript
describe('createTypeScriptPlugin manifest', () => {
  it('should expose the plugin id from codegraphy.json', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.id).toBe('codegraphy.typescript');
  });

  it('should expose the plugin name', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.name).toBeTruthy();
  });

  it('should expose the plugin version', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.version).toBeTruthy();
  });

  it('should expose the apiVersion', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.apiVersion).toBeTruthy();
  });

  it('should support TypeScript and JavaScript extensions', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.supportedExtensions).toContain('.ts');
    expect(plugin.supportedExtensions).toContain('.tsx');
    expect(plugin.supportedExtensions).toContain('.js');
    expect(plugin.supportedExtensions).toContain('.jsx');
  });

  it('should expose rules from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.rules).toBeDefined();
    expect(plugin.rules!.length).toBe(4);
  });

  it('should expose fileColors from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.fileColors).toBeDefined();
  });

  it('should expose defaultFilters from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.defaultFilters).toBeDefined();
    expect(plugin.defaultFilters).toContain('**/node_modules/**');
  });
});

describe('createTypeScriptPlugin lifecycle', () => {
  it('should initialize without error', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
  });

  it('should handle detectConnections without prior initialize', async () => {
    const plugin = createTypeScriptPlugin();
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot
    );
    expect(connections).toEqual([]);
  });

  it('should reset resolver on unload', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();
    // After unload, detectConnections should still work (lazy init)
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot
    );
    expect(connections).toEqual([]);
  });
});
```

Also move the `ruleId` tests into index.test.ts under a describe block named `'rule identification'`, then delete `ruleId.test.ts`.

- [ ] **Step 3: Run all tests**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/plugin-typescript/__tests__/
git commit -m "refactor(typescript): rename Integration.test.ts to index.test.ts with manifest tests"
```

---

### Task 8: Create per-rule test file for es6-import

**Files:**
- Create: `packages/plugin-typescript/__tests__/es6-import.test.ts`

- [ ] **Step 1: Write the rule test file**

```typescript
// packages/plugin-typescript/__tests__/es6-import.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/rules/es6-import';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('es6-import rule', () => {
  let context: TsRuleContext;
  const workspaceRoot = '/workspace';
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver(workspaceRoot) };
  });

  it('should detect default import', () => {
    const content = `import foo from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].type).toBe('static');
    expect(connections[0].ruleId).toBe('es6-import');
  });

  it('should detect named import', () => {
    const content = `import { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
  });

  it('should detect namespace import', () => {
    const content = `import * as utils from './utils';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect side-effect import', () => {
    const content = `import './styles.css';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./styles.css');
  });

  it('should detect multiple imports', () => {
    const content = `import { a } from './a';\nimport { b } from './b';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('./a');
    expect(connections[1].specifier).toBe('./b');
  });

  it('should return empty for files with no imports', () => {
    const content = `const x = 42;\nconsole.log(x);`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should detect import from npm package', () => {
    const content = `import React from 'react';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('react');
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should handle tsx file extensions', () => {
    const tsxFile = '/workspace/src/App.tsx';
    const content = `import { Button } from './Button';`;
    const connections = detect(content, tsxFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./Button');
  });

  it('should handle js file extensions', () => {
    const jsFile = '/workspace/src/app.js';
    const content = `import { helper } from './helper';`;
    const connections = detect(content, jsFile, context);

    expect(connections).toHaveLength(1);
  });

  it('should handle jsx file extensions', () => {
    const jsxFile = '/workspace/src/App.jsx';
    const content = `import { Component } from './Component';`;
    const connections = detect(content, jsxFile, context);

    expect(connections).toHaveLength(1);
  });

  it('should not detect require calls', () => {
    const content = `const foo = require('./bar');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect dynamic imports', () => {
    const content = `const mod = import('./lazy');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect export declarations', () => {
    const content = `export { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/es6-import.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-typescript/__tests__/es6-import.test.ts
git commit -m "test(typescript): add per-rule tests for es6-import"
```

---

### Task 9: Create per-rule test file for dynamic-import

**Files:**
- Create: `packages/plugin-typescript/__tests__/dynamic-import.test.ts`

- [ ] **Step 1: Write the rule test file**

```typescript
// packages/plugin-typescript/__tests__/dynamic-import.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/rules/dynamic-import';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('dynamic-import rule', () => {
  let context: TsRuleContext;
  const workspaceRoot = '/workspace';
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver(workspaceRoot) };
  });

  it('should detect dynamic import expression', () => {
    const content = `const mod = import('./lazy');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./lazy');
    expect(connections[0].type).toBe('dynamic');
    expect(connections[0].ruleId).toBe('dynamic-import');
  });

  it('should detect dynamic import in async function', () => {
    const content = `async function load() { const m = await import('./module'); }`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./module');
  });

  it('should detect dynamic import with then', () => {
    const content = `import('./module').then(m => m.default);`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./module');
  });

  it('should detect multiple dynamic imports', () => {
    const content = `const a = import('./a');\nconst b = import('./b');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('./a');
    expect(connections[1].specifier).toBe('./b');
  });

  it('should return empty for files with no dynamic imports', () => {
    const content = `const x = 42;`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const content = `import { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect require calls', () => {
    const content = `const foo = require('./bar');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should ignore dynamic import with non-string argument', () => {
    const content = `const name = './mod'; import(name);`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should detect dynamic import of npm package', () => {
    const content = `const React = import('react');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('react');
    expect(connections[0].resolvedPath).toBeNull();
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/dynamic-import.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-typescript/__tests__/dynamic-import.test.ts
git commit -m "test(typescript): add per-rule tests for dynamic-import"
```

---

### Task 10: Create per-rule test file for commonjs-require

**Files:**
- Create: `packages/plugin-typescript/__tests__/commonjs-require.test.ts`

- [ ] **Step 1: Write the rule test file**

```typescript
// packages/plugin-typescript/__tests__/commonjs-require.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/rules/commonjs-require';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('commonjs-require rule', () => {
  let context: TsRuleContext;
  const workspaceRoot = '/workspace';
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver(workspaceRoot) };
  });

  it('should detect require call', () => {
    const content = `const foo = require('./bar');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].type).toBe('require');
    expect(connections[0].ruleId).toBe('commonjs-require');
  });

  it('should detect require without assignment', () => {
    const content = `require('./setup');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./setup');
  });

  it('should detect destructured require', () => {
    const content = `const { a, b } = require('./utils');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect multiple requires', () => {
    const content = `const a = require('./a');\nconst b = require('./b');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('./a');
    expect(connections[1].specifier).toBe('./b');
  });

  it('should return empty for files with no requires', () => {
    const content = `const x = 42;`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const content = `import { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect dynamic imports', () => {
    const content = `const mod = import('./bar');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should detect require of npm package', () => {
    const content = `const express = require('express');`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('express');
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should ignore require with no arguments', () => {
    const content = `const x = require();`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should ignore non-string require arguments', () => {
    const content = `const name = './mod'; const x = require(name);`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should handle .cjs file extensions', () => {
    const cjsFile = '/workspace/src/test.cjs';
    const content = `const foo = require('./bar');`;
    const connections = detect(content, cjsFile, context);

    expect(connections).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/commonjs-require.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-typescript/__tests__/commonjs-require.test.ts
git commit -m "test(typescript): add per-rule tests for commonjs-require"
```

---

### Task 11: Create per-rule test file for reexport

**Files:**
- Create: `packages/plugin-typescript/__tests__/reexport.test.ts`

- [ ] **Step 1: Write the rule test file**

```typescript
// packages/plugin-typescript/__tests__/reexport.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/rules/reexport';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('reexport rule', () => {
  let context: TsRuleContext;
  const workspaceRoot = '/workspace';
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver(workspaceRoot) };
  });

  it('should detect named re-export', () => {
    const content = `export { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].type).toBe('reexport');
    expect(connections[0].ruleId).toBe('reexport');
  });

  it('should detect star re-export', () => {
    const content = `export * from './utils';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect star re-export with alias', () => {
    const content = `export * as utils from './utils';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect multiple re-exports', () => {
    const content = `export { a } from './a';\nexport { b } from './b';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('./a');
    expect(connections[1].specifier).toBe('./b');
  });

  it('should return empty for files with no re-exports', () => {
    const content = `const x = 42;\nexport default x;`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const content = `import { foo } from './bar';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should not detect local exports', () => {
    const content = `export const foo = 42;`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });

  it('should detect re-export of npm package', () => {
    const content = `export { useState } from 'react';`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('react');
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should not detect export default declaration', () => {
    const content = `export default function myFunc() {}`;
    const connections = detect(content, testFile, context);

    expect(connections).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @codegraphy/plugin-typescript exec vitest run __tests__/reexport.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-typescript/__tests__/reexport.test.ts
git commit -m "test(typescript): add per-rule tests for reexport"
```

---

## Chunk 3: Kill Mutation Survivors and Reach ≥ 80%

### Task 12: Run mutation testing and iteratively kill survivors

This task is iterative. Run mutation tests, identify survivors, write targeted tests to kill them, repeat until ≥ 80%.

**Files:**
- Modify: Various test files based on mutation results

- [ ] **Step 1: Run mutation testing after all source and test changes**

Run: `pnpm run mutate -- plugin-typescript`

Record the current mutation score and list all surviving mutants with file:line references.

- [ ] **Step 2: Kill survivors in each file**

For each file with survivors:
1. Read the surviving mutant details from the mutation report
2. Write a targeted test that would fail if the mutant were applied
3. Run the specific test file to verify it passes
4. Re-run mutation tests for that file to confirm the mutant is killed

Common survivor patterns to expect:
- **Regex mutations** in `builtins.ts` (`isBareSpecifier` regex) — write tests with edge-case specifiers
- **Boundary mutations** — e.g., `>` → `>=`, removing `|| ''` guards
- **String mutations** — e.g., `'node:'` → `''`, removal of string literals
- **Conditional mutations** — removing early returns, negating conditions

- [ ] **Step 3: Iterate until overall score ≥ 80%**

Run: `pnpm run mutate -- plugin-typescript`
Check: Overall mutation score ≥ 80%

If still below 80%, repeat Step 2 for remaining survivors.

- [ ] **Step 4: Run all quality gates**

```bash
pnpm --filter @codegraphy/plugin-typescript exec vitest run
pnpm run crap -- plugin-typescript
pnpm run mutate -- plugin-typescript
pnpm run lint
pnpm run typecheck
```

All must pass:
- Tests: all green
- CRAP: all ≤ 8
- Mutation: ≥ 80%
- Mutation sites: all files ≤ 50
- Lint: clean
- Typecheck: clean

- [ ] **Step 5: Final commit**

```bash
git add packages/plugin-typescript/
git commit -m "test(typescript): kill mutation survivors to reach ≥80% score"
```

---

## Chunk 4: Final Verification and Cleanup

### Task 13: Full test suite and cleanup

- [ ] **Step 1: Run full monorepo test suite**

Run: `pnpm run test`
Expected: All 1173+ tests pass (no regressions in other packages)

- [ ] **Step 2: Run lint and typecheck**

Run: `pnpm run lint && pnpm run typecheck`
Expected: Clean

- [ ] **Step 3: Final mutation report**

Run: `pnpm run mutate -- plugin-typescript`
Record final score in commit message.

- [ ] **Step 4: Final commit with summary**

```bash
git add -A
git commit -m "refactor(typescript): complete plugin refactoring with mutation score ≥80%"
```
