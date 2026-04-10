/**
 * @fileoverview Integration tests for the TypeScript plugin.
 * Uses the example TypeScript project in src/plugins/typescript/examples to verify
 * that the plugin detects connections end-to-end, matching what
 * the pipeline would produce.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createTypeScriptPlugin } from '../src/plugin';
import * as tsconfig from '../src/tsconfig';
import type { CodeGraphyAPI, IGraphData } from '@codegraphy-vscode/plugin-api';

const TS_EXAMPLE_ROOT = path.join(__dirname, '../examples');

async function analyzeRelations(
  plugin: ReturnType<typeof createTypeScriptPlugin>,
  filePath: string,
  content: string,
  workspaceRoot: string,
) {
  expect(plugin.analyzeFile).toBeDefined();

  const analysis = await plugin.analyzeFile!(filePath, content, workspaceRoot);

  expect(analysis.filePath).toBe(filePath);
  return analysis.relations ?? [];
}

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
    expect(plugin.sources).toEqual([
      expect.objectContaining({ id: 'dynamic-import' }),
      expect.objectContaining({ id: 'commonjs-require' }),
    ]);
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

    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `const mod = import('./config');`;
    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    expect(relations.length).toBeGreaterThan(0);
  });

  it('should lazy-initialize resolver if analyzeFile is called before initialize', async () => {
    const plugin = createTypeScriptPlugin();
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `const mod = import('./config');`;
    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    expect(relations.length).toBeGreaterThan(0);
  });

  it('should handle analyzeFile without prior initialize', async () => {
    const plugin = createTypeScriptPlugin();
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot,
    );
    expect(relations).toEqual([]);
  });

  it('should reset resolver on unload', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot,
    );
    expect(relations).toEqual([]);
  });

  it('should re-create resolver after unload when analyzeFile is called', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();

    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `const mod = import('./config');`;
    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    expect(relations.length).toBeGreaterThan(0);
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

  it('should not call loadTsConfig again on second analyzeFile after initialize', async () => {
    const plugin = createTypeScriptPlugin();
    const loadSpy = vi.spyOn(tsconfig, 'loadTsConfig');

    await plugin.initialize?.(workspaceRoot);
    const callCountAfterInit = loadSpy.mock.calls.length;

    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(loadSpy.mock.calls.length).toBe(callCountAfterInit);
    loadSpy.mockRestore();
  });

  it('should re-initialize resolver with new workspace root after unload', async () => {
    const plugin = createTypeScriptPlugin();
    const loadSpy = vi.spyOn(tsconfig, 'loadTsConfig');

    await plugin.initialize?.(workspaceRoot);
    const callCountAfterInit = loadSpy.mock.calls.length;

    plugin.onUnload?.();

    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(loadSpy.mock.calls.length).toBeGreaterThan(callCountAfterInit);
    loadSpy.mockRestore();
  });

  it('returns supplemental relations from analyzeFile', async () => {
    const plugin = createTypeScriptPlugin();
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `
      const config = import('./config');
      const helpers = require('./utils/helpers');
    `;

    const analysis = await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(analysis?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          sourceId: 'dynamic-import',
          specifier: './config',
          resolvedPath: path.join(workspaceRoot, 'src', 'config.ts'),
        }),
        expect.objectContaining({
          kind: 'import',
          sourceId: 'commonjs-require',
          specifier: './utils/helpers',
          resolvedPath: path.join(workspaceRoot, 'src', 'utils', 'helpers.ts'),
        }),
      ]),
    );
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

  it('keeps external package nodes in the focused imports view', () => {
    const plugin = createTypeScriptPlugin();
    const registerView = vi.fn(() => ({ dispose: vi.fn() }));
    const api = { registerView } as unknown as Pick<CodeGraphyAPI, 'registerView'>;

    plugin.onLoad?.(api as CodeGraphyAPI);

    const view = registerView.mock.calls[0]?.[0];
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        {
          id: 'pkg:fs',
          label: 'fs',
          color: '#F59E0B',
          nodeType: 'package',
          shape2D: 'hexagon',
          shape3D: 'cube',
        },
      ],
      edges: [
        {
          id: 'src/index.ts->pkg:fs#import',
          from: 'src/index.ts',
          to: 'pkg:fs',
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
      ],
    };

    const transformed = view.transform(graphData, {
      activePlugins: new Set(),
      focusedFile: 'src/index.ts',
      depthLimit: 1,
    });

    expect(transformed.nodes.map(node => node.id)).toEqual(['src/index.ts', 'pkg:fs']);
    expect(transformed.edges).toEqual([
      expect.objectContaining({
        from: 'src/index.ts',
        to: 'pkg:fs',
      }),
    ]);
  });

  it('keeps focused imports available even without a TypeScript-focused editor', () => {
    const plugin = createTypeScriptPlugin();
    const registerView = vi.fn(() => ({ dispose: vi.fn() }));
    const api = { registerView } as unknown as Pick<CodeGraphyAPI, 'registerView'>;

    plugin.onLoad?.(api as CodeGraphyAPI);

    const view = registerView.mock.calls[0]?.[0];
    expect(view.isAvailable).toBeUndefined();
  });

  it('returns an empty graph when the focused file is outside the import graph', () => {
    const plugin = createTypeScriptPlugin();
    const registerView = vi.fn(() => ({ dispose: vi.fn() }));
    const api = { registerView } as unknown as Pick<CodeGraphyAPI, 'registerView'>;

    plugin.onLoad?.(api as CodeGraphyAPI);

    const view = registerView.mock.calls[0]?.[0];
    const transformed = view.transform({
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/utils.ts->pkg:fs#import',
          from: 'src/utils.ts',
          to: 'pkg:fs',
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
      ],
    }, {
      activePlugins: new Set(),
      focusedFile: 'src/index.ts',
      depthLimit: 1,
    });

    expect(transformed).toEqual({ nodes: [], edges: [] });
  });
});

describe('source identification', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('does not emit duplicate static-import relations already owned by the core pass', async () => {
    const content = `import { foo } from './bar';`;
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'test.ts'),
      content,
      workspaceRoot,
    );
    expect(relations).toEqual([]);
  });

  it('sets dynamic-import sourceId for dynamic imports', async () => {
    const content = `const mod = import('./bar');`;
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'test.ts'),
      content,
      workspaceRoot,
    );
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].kind).toBe('import');
    expect(relations[0].sourceId).toBe('dynamic-import');
  });

  it('sets commonjs-require sourceId for require calls', async () => {
    const content = `const foo = require('./bar');`;
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'test.ts'),
      content,
      workspaceRoot,
    );
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].kind).toBe('import');
    expect(relations[0].sourceId).toBe('commonjs-require');
  });

  it('does not emit duplicate re-export relations already owned by the core pass', async () => {
    const content = `export { foo } from './bar';`;
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'test.ts'),
      content,
      workspaceRoot,
    );
    expect(relations).toEqual([]);
  });

  it('every relation has sourceId and kind set', async () => {
    const content = `
      const b = require('./b');
      const d = import('./d');
    `;
    const relations = await analyzeRelations(
      plugin,
      path.join(workspaceRoot, 'test.ts'),
      content,
      workspaceRoot,
    );
    for (const relation of relations) {
      expect(relation.sourceId).toBeDefined();
      expect(typeof relation.sourceId).toBe('string');
      expect(relation.kind).toBeDefined();
      expect(typeof relation.kind).toBe('string');
    }
  });
});

describe('TypeScript Plugin Integration', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('detects dynamic imports in JS/TS files', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `const mod = import('./config');`;

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    expect(relations.length).toBeGreaterThan(0);
  });

  it('resolves dynamic imports to workspace files', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `const mod = import('./config');`;

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    const resolvedRels = relations
      .filter(relation => relation.resolvedPath !== null && relation.resolvedPath !== undefined)
      .map(relation => path.relative(workspaceRoot, relation.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/config.ts');
  });

  it('returns absolute resolvedPaths for all resolved connections', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `
      const config = import('./config');
      const helpers = require('./utils/helpers');
    `;

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    for (const relation of relations.filter(item => item.resolvedPath !== null && item.resolvedPath !== undefined)) {
      expect(path.isAbsolute(relation.resolvedPath!)).toBe(true);
    }
  });

  it('config.ts has no outgoing connections (it imports nothing)', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    const resolved = relations.filter(relation => relation.resolvedPath !== null && relation.resolvedPath !== undefined);
    expect(resolved.length).toBe(0);
  });

  it('builds a small supplemental edge set for dynamic import and require', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `
      const config = import('./config');
      const helpers = require('./utils/helpers');
    `;

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    const edges = relations
      .filter((relation) => relation.resolvedPath)
      .map((relation) => ({
        from: path.relative(workspaceRoot, relation.fromFilePath).replace(/\\/g, '/'),
        to: path.relative(workspaceRoot, relation.resolvedPath!).replace(/\\/g, '/'),
        sourceId: relation.sourceId,
      }));

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/dynamic.ts',
          to: 'src/config.ts',
          sourceId: 'dynamic-import',
        }),
        expect.objectContaining({
          from: 'src/dynamic.ts',
          to: 'src/utils/helpers.ts',
          sourceId: 'commonjs-require',
        }),
      ]),
    );
  });

  it('resolves tsconfig path aliases in dynamic imports', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'dynamic.ts');
    const content = `
      const app = import('@components/App');
      const api = import('@services/api');
    `;

    const relations = await analyzeRelations(plugin, filePath, content, workspaceRoot);
    const resolvedRels = relations
      .filter(relation => relation.resolvedPath !== null && relation.resolvedPath !== undefined)
      .map(relation => path.relative(workspaceRoot, relation.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/components/App.tsx');
    expect(resolvedRels).toContain('src/services/api.ts');
  });
});
