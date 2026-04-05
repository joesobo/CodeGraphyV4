/**
 * @fileoverview Integration tests for the TypeScript plugin.
 * Uses the example TypeScript project in src/plugins/typescript/examples to verify
 * that the plugin detects connections end-to-end, matching what
 * WorkspaceAnalyzer would produce.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createTypeScriptPlugin } from '../src';
import * as tsconfig from '../src/tsconfig';
import type { CodeGraphyAPI, IGraphData } from '@codegraphy-vscode/plugin-api';

const TS_EXAMPLE_ROOT = path.join(__dirname, '../examples');

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

  it('should expose sources from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.sources).toBeDefined();
    expect(plugin.sources!.length).toBe(4);
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
  const workspaceRoot = TS_EXAMPLE_ROOT;

  it('should initialize without error', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
  });

  it('should create resolver during initialize', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);

    // After initialize, resolver exists, so detectConnections works with imports
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('should lazy-initialize resolver if not initialized', async () => {
    const plugin = createTypeScriptPlugin();
    // Do NOT call initialize — go straight to detectConnections
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
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
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot
    );
    expect(connections).toEqual([]);
  });

  it('should re-create resolver after unload when detectConnections is called', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();

    // Now calling detectConnections should lazy-init a new resolver
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('should log during initialization', async () => {
    // Distinguishes the console.log StringLiteral "" mutation in initialize:
    // initialize must emit a non-empty log message
    const plugin = createTypeScriptPlugin();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await plugin.initialize?.(workspaceRoot);

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).not.toBe('');
    logSpy.mockRestore();
  });

  it('should not call loadTsConfig again on second detectConnections after initialize', async () => {
    // Distinguishes the !resolver always-true mutation: after initialize() creates
    // the resolver, subsequent detectConnections calls must reuse it — not re-run
    // loadTsConfig on every invocation.
    const plugin = createTypeScriptPlugin();
    const loadSpy = vi.spyOn(tsconfig, 'loadTsConfig');

    await plugin.initialize?.(workspaceRoot);
    const callCountAfterInit = loadSpy.mock.calls.length;

    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    await plugin.detectConnections(filePath, content, workspaceRoot);
    await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(loadSpy.mock.calls.length).toBe(callCountAfterInit);
    loadSpy.mockRestore();
  });

  it('should re-initialize resolver with new workspace root after unload', async () => {
    // Distinguishes the onUnload BlockStatement {} mutation: if onUnload does NOT
    // clear resolver to null, detectConnections skips the lazy-init branch and reuses
    // the stale resolver. We verify loadTsConfig is called again after unload.
    const plugin = createTypeScriptPlugin();
    const loadSpy = vi.spyOn(tsconfig, 'loadTsConfig');

    await plugin.initialize?.(workspaceRoot);
    const callCountAfterInit = loadSpy.mock.calls.length;

    plugin.onUnload?.();

    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    await plugin.detectConnections(filePath, content, workspaceRoot);

    // After unload, detectConnections must have called loadTsConfig once more
    expect(loadSpy.mock.calls.length).toBeGreaterThan(callCountAfterInit);
    loadSpy.mockRestore();
  });

  it('registers a focused imports view on load', () => {
    const plugin = createTypeScriptPlugin();
    const registerView = vi.fn(() => ({ dispose: vi.fn() }));
    const api = { registerView } as unknown as Pick<CodeGraphyAPI, 'registerView'>;

    plugin.onLoad?.(api as CodeGraphyAPI);

    expect(registerView).toHaveBeenCalledOnce();
    const view = registerView.mock.calls[0]?.[0];
    expect(view).toMatchObject({
      id: 'codegraphy.typescript.focused-imports',
      name: 'Focused Imports',
      icon: 'symbol-file',
      description: 'Shows the import neighborhood around the focused file',
      recomputeOn: ['focusedFile', 'depthLimit'],
    });
  });

  it('filters the graph around the focused file when the view transforms data', () => {
    const plugin = createTypeScriptPlugin();
    const registerView = vi.fn(() => ({ dispose: vi.fn() }));
    const api = { registerView } as unknown as Pick<CodeGraphyAPI, 'registerView'>;

    plugin.onLoad?.(api as CodeGraphyAPI);

    const view = registerView.mock.calls[0]?.[0];
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/components/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils/helpers.ts', label: 'helpers.ts', color: '#fff' },
        { id: 'src/config.ts', label: 'config.ts', color: '#fff' },
        { id: 'src/unrelated.ts', label: 'unrelated.ts', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/components/App.tsx#import',
          from: 'src/index.ts',
          to: 'src/components/App.tsx',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'src/index.ts->src/utils/helpers.ts#import',
          from: 'src/index.ts',
          to: 'src/utils/helpers.ts',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'src/utils/helpers.ts->src/config.ts#import',
          from: 'src/utils/helpers.ts',
          to: 'src/config.ts',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'src/unrelated.ts->src/config.ts#import',
          from: 'src/unrelated.ts',
          to: 'src/config.ts',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'docs/Note.md->src/index.ts#reference',
          from: 'docs/Note.md',
          to: 'src/index.ts',
          kind: 'reference',
          sources: [
            {
              id: 'codegraphy.markdown:wikilink',
              pluginId: 'codegraphy.markdown',
              sourceId: 'wikilink',
              label: 'Wikilinks',
            },
          ],
        },
      ],
    };

    const transformed = view.transform(graphData, {
      activePlugins: new Set(),
      focusedFile: 'src/index.ts',
      depthLimit: 1,
    });

    expect(transformed.nodes.map(node => node.id)).toEqual([
      'src/index.ts',
      'src/components/App.tsx',
      'src/utils/helpers.ts',
    ]);
    expect(transformed.nodes.find(node => node.id === 'src/index.ts')?.depthLevel).toBe(0);
    expect(transformed.nodes.find(node => node.id === 'src/components/App.tsx')?.depthLevel).toBe(1);
    expect(transformed.nodes.find(node => node.id === 'src/utils/helpers.ts')?.depthLevel).toBe(1);
    expect(transformed.edges).toEqual([
      expect.objectContaining({
        from: 'src/index.ts',
        to: 'src/components/App.tsx',
      }),
      expect.objectContaining({
        from: 'src/index.ts',
        to: 'src/utils/helpers.ts',
      }),
    ]);
    expect(transformed.nodes.some(node => node.id === 'src/config.ts')).toBe(false);
    expect(transformed.nodes.some(node => node.id === 'src/unrelated.ts')).toBe(false);
    expect(transformed.nodes.some(node => node.id === 'docs/Note.md')).toBe(false);
  });
});

describe('source identification', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('sets es6-import sourceId for static imports', async () => {
    const content = `import { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].kind).toBe('import');
    expect(connections[0].sourceId).toBe('es6-import');
  });

  it('sets dynamic-import sourceId for dynamic imports', async () => {
    const content = `const mod = import('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].kind).toBe('import');
    expect(connections[0].sourceId).toBe('dynamic-import');
  });

  it('sets commonjs-require sourceId for require calls', async () => {
    const content = `const foo = require('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].kind).toBe('import');
    expect(connections[0].sourceId).toBe('commonjs-require');
  });

  it('sets reexport sourceId for re-exports', async () => {
    const content = `export { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].kind).toBe('reexport');
    expect(connections[0].sourceId).toBe('reexport');
  });

  it('every connection has sourceId and kind set', async () => {
    const content = `
      import { a } from './a';
      const b = require('./b');
      export { c } from './c';
      const d = import('./d');
    `;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    for (const conn of connections) {
      expect(conn.sourceId).toBeDefined();
      expect(typeof conn.sourceId).toBe('string');
      expect(conn.kind).toBeDefined();
      expect(typeof conn.kind).toBe('string');
    }
  });
});

describe('TypeScript Plugin Integration', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('detects imports in index.ts', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('resolves relative import from index.ts to config.ts', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolvedRels = connections
      .filter(conn => conn.resolvedPath !== null)
      .map(conn => path.relative(workspaceRoot, conn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/config.ts');
  });

  it('returns absolute resolvedPaths for all resolved connections', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    for (const conn of connections.filter(connection => connection.resolvedPath !== null)) {
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
    }
  });

  it('config.ts has no outgoing connections (it imports nothing)', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolved = connections.filter(conn => conn.resolvedPath !== null);
    expect(resolved.length).toBe(0);
  });

  it('builds a complete edge graph across the example project', async () => {
    const tsFiles = [
      'src/index.ts',
      'src/config.ts',
      'src/orphan.ts',
      'src/services/api.ts',
      'src/utils/helpers.ts',
      'src/utils/format.ts',
      'src/utils/styles.ts',
    ].filter(filePath => fs.existsSync(path.join(workspaceRoot, filePath)));

    const edges: Array<{ from: string; to: string }> = [];

    for (const relPath of tsFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = await plugin.detectConnections(absPath, content, workspaceRoot);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          const toRel = path.relative(workspaceRoot, conn.resolvedPath).replace(/\\/g, '/');
          if (tsFiles.includes(toRel)) {
            edges.push({ from: relPath, to: toRel });
          }
        }
      }
    }

    // index.ts must have at least one edge (to config.ts)
    expect(edges.some(e => e.from === 'src/index.ts')).toBe(true);
    expect(edges.some(e => e.to === 'src/config.ts')).toBe(true);
  });

  it('resolves tsconfig path aliases with slash patterns (e.g. "@/*", "@components/*")', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolvedRels = connections
      .filter(conn => conn.resolvedPath !== null)
      .map(conn => path.relative(workspaceRoot, conn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/components/App.tsx');
    expect(resolvedRels).toContain('src/services/api.ts');
  });
});
