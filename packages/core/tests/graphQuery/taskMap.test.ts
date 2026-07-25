import { describe, expect, it } from 'vitest';
import type { GraphQueryData } from '../../src/graphQuery/data';
import { mapGraphTask } from '../../src/graphQuery/taskMap';

const data: GraphQueryData = {
  graphData: {
    nodes: [
      { id: 'src/registry.ts', label: 'registry.ts', nodeType: 'file' },
      { id: 'src/engine.ts', label: 'engine.ts', nodeType: 'file' },
      { id: 'src/workspace.ts', label: 'workspace.ts', nodeType: 'file' },
      { id: 'src/unrelated.ts', label: 'unrelated.ts', nodeType: 'file' },
      { id: 'tests/registry.test.ts', label: 'registry.test.ts', nodeType: 'file' },
      {
        id: 'src/registry.ts#unloadPlugin:function',
        label: 'unloadPlugin',
        nodeType: 'symbol:function',
        symbol: { id: 'src/registry.ts#unloadPlugin:function', filePath: 'src/registry.ts', name: 'unloadPlugin', kind: 'function' },
      },
      {
        id: 'src/engine.ts#rebuild:function',
        label: 'rebuild',
        nodeType: 'symbol:function',
        symbol: { id: 'src/engine.ts#rebuild:function', filePath: 'src/engine.ts', name: 'rebuild', kind: 'function' },
      },
    ],
    edges: [
      { id: 'engine-registry', from: 'src/engine.ts#rebuild:function', to: 'src/registry.ts#unloadPlugin:function', kind: 'call', sources: [] },
      { id: 'workspace-engine', from: 'src/workspace.ts', to: 'src/engine.ts', kind: 'import', sources: [] },
      { id: 'test-registry', from: 'tests/registry.test.ts', to: 'src/registry.ts', kind: 'import', sources: [] },
    ],
  },
  symbols: [
    { id: 'src/registry.ts#unloadPlugin:function', filePath: 'src/registry.ts', name: 'unloadPlugin', kind: 'function' },
    { id: 'src/engine.ts#rebuild:function', filePath: 'src/engine.ts', name: 'rebuild', kind: 'function' },
  ],
  sourceText: {
    files: [
      { filePath: 'src/registry.ts', content: 'export async function unloadPlugin() { /* plugin runtime cleanup */ }' },
      { filePath: 'src/engine.ts', content: 'export function rebuild() {}' },
      { filePath: 'src/workspace.ts', content: 'export function loadWorkspaceLifecycle() {}' },
      { filePath: 'src/unrelated.ts', content: 'export const unrelated = true;' },
      { filePath: 'tests/registry.test.ts', content: 'it("cleans plugin runtime after failure", () => {});' },
    ],
    filesScanned: 5,
    filesSkipped: 0,
  },
  cacheState: 'fresh',
};

describe('core/graphQuery task map', () => {
  it('combines task terms, declarations, and typed graph links in a small File map', () => {
    expect(mapGraphTask(data, {
      query: 'plugin runtime cleanup during workspace loading failure',
      limit: 4,
    })).toEqual({
      query: 'plugin runtime cleanup during workspace loading failure',
      terms: ['plugin', 'runtime', 'cleanup', 'workspace', 'loading', 'failure'],
      files: [
        {
          path: 'src/workspace.ts',
          nodeType: 'file',
          matchedTerms: ['workspace', 'loading'],
          symbols: [],
        },
        {
          path: 'tests/registry.test.ts',
          nodeType: 'file',
          matchedTerms: ['plugin', 'runtime', 'failure'],
          symbols: [],
        },
        {
          path: 'src/registry.ts',
          nodeType: 'file',
          matchedTerms: ['plugin', 'runtime', 'cleanup'],
          symbols: [{ id: 'src/registry.ts#unloadPlugin:function', name: 'unloadPlugin', kind: 'function' }],
        },
        {
          path: 'src/engine.ts',
          nodeType: 'file',
          matchedTerms: [],
          symbols: [{ id: 'src/engine.ts#rebuild:function', name: 'rebuild', kind: 'function' }],
        },
      ],
      relationships: [
        { from: 'src/engine.ts', to: 'src/registry.ts', edgeTypes: ['call'] },
        { from: 'src/workspace.ts', to: 'src/engine.ts', edgeTypes: ['import'] },
        { from: 'tests/registry.test.ts', to: 'src/registry.ts', edgeTypes: ['import'] },
      ],
      page: { offset: 0, limit: 4, returned: 4, total: 4, nextOffset: null },
      limits: { relationships: 8, complete: true },
      sources: {
        text: { freshness: 'live', filesScanned: 5, filesSkipped: 0 },
        graph: { freshness: 'cached', cacheState: 'fresh' },
      },
    });
  });

  it('reports truncation for every partial page and clamps public File bounds', () => {
    const first = mapGraphTask(data, { query: 'plugin runtime failure', limit: 1 });
    const final = mapGraphTask(data, { query: 'plugin runtime failure', limit: 1, offset: 2 });
    const oversized = mapGraphTask(data, { query: 'plugin runtime failure', limit: 100 });

    expect(first.page).toMatchObject({ limit: 1, returned: 1, total: 3, nextOffset: 1 });
    expect(first.limits.complete).toBe(false);
    expect(first.relationships).toEqual([]);
    expect(final.page).toMatchObject({ offset: 2, returned: 1, nextOffset: null });
    expect(final.limits.complete).toBe(false);
    expect(oversized.page.limit).toBe(20);
  });

  it('returns an empty bounded map rather than throwing for malformed library input', () => {
    expect(mapGraphTask(data, { query: undefined as unknown as string })).toMatchObject({
      query: '',
      terms: [],
      files: [],
      relationships: [],
      page: { limit: 6, returned: 0, total: 0 },
      limits: { complete: true },
    });
  });

  it('matches common query inflections symmetrically without substring matches', () => {
    const inflectedData: GraphQueryData = {
      ...data,
      sourceText: {
        ...data.sourceText!,
        files: data.sourceText!.files.map(file => file.filePath === 'src/unrelated.ts'
          ? { ...file, content: 'export function runPluginAfterTaskFailed() {}' }
          : file),
      },
    };
    const report = mapGraphTask(inflectedData, { query: 'running plugin fail', limit: 8 });
    const unrelated = report.files.find(file => file.path === 'src/unrelated.ts');
    const registry = report.files.find(file => file.path === 'src/registry.ts');

    expect(unrelated?.matchedTerms).toEqual(['running', 'plugin', 'fail']);
    expect(registry?.matchedTerms).toEqual(['plugin']);
  });
});
