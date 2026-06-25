import { describe, expect, it, vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  refreshWorkspaceIndexAnalysisScope,
  refreshWorkspaceIndexChangedFiles,
  refreshWorkspaceIndexPluginFiles,
} from '../../src/indexing/refresh';
import type { IGraphData } from '../../src/graph/contracts';
import {
  createDiscoveredFile,
  createFileAnalysis,
  createGraphNode,
  createSource,
  refreshOptions,
} from './refresh/fixture';

describe('indexing/refresh', () => {
  it('lets file analysis own pre-analysis during analysis scope refreshes', async () => {
    const source = createSource();
    const sequence: string[] = [];
    source._preAnalyzePlugins = vi.fn(async () => {
      sequence.push('pre-analyze');
    });
    source._analyzeFiles = vi.fn(async () => {
      sequence.push('analyze');
      return {
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map<string, IFileAnalysisResult>(),
        fileConnections: new Map(),
      };
    });

    await refreshWorkspaceIndexAnalysisScope(source, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles: [createDiscoveredFile('src/plugin.ts')],
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(async () => undefined),
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._preAnalyzePlugins).not.toHaveBeenCalled();
    expect(sequence).toEqual(['analyze']);
  });

  it('does not pre-analyze eagerly before a scope refresh can reuse cached analysis', async () => {
    const source = createSource();
    const discoveredFiles = [createDiscoveredFile('src/plugin.ts')];
    source._analyzeFiles = vi.fn(async () => ({
      cacheHits: 1,
      cacheMisses: 0,
      fileAnalysis: new Map<string, IFileAnalysisResult>([
        ['src/plugin.ts', createFileAnalysis('/workspace/src/plugin.ts')],
      ]),
      fileConnections: new Map([
        ['src/plugin.ts', []],
      ]),
    }));

    await refreshWorkspaceIndexAnalysisScope(source, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles,
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(async () => undefined),
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._preAnalyzePlugins).not.toHaveBeenCalled();
    expect(source._analyzeFiles).toHaveBeenCalledWith(
      discoveredFiles,
      '/workspace',
      expect.any(Function),
      undefined,
      undefined,
      new Set(),
    );
  });

  it('keeps discovered file nodes when refreshing plugin data from a discover-only graph', async () => {
    const source = createSource();
    const discoveredFiles = [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/plugin.ts'),
      createDiscoveredFile('src/plain.txt'),
    ];

    const graph = await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles,
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(async () => undefined),
      pluginIds: ['codegraphy.typescript'],
      pluginInfos: [{
        plugin: {
          id: 'codegraphy.typescript',
          supportedExtensions: ['.ts'],
        },
      }],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [createDiscoveredFile('src/plugin.ts')],
      '/workspace',
      expect.any(Function),
      undefined,
      ['codegraphy.typescript'],
      new Set(),
    );
    expect(graph.nodes.map(node => node.id)).toEqual([
      'src/plugin.ts',
      'README.md',
      'src/plain.txt',
    ]);
  });

  it('lets file analysis own pre-analysis during plugin file refreshes', async () => {
    const source = createSource();
    const sequence: string[] = [];
    source._preAnalyzePlugins = vi.fn(async () => {
      sequence.push('pre-analyze');
    });
    source._analyzeFiles = vi.fn(async () => {
      sequence.push('analyze');
      return {
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map<string, IFileAnalysisResult>(),
        fileConnections: new Map(),
      };
    });

    await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles: [
        createDiscoveredFile('README.md'),
        createDiscoveredFile('src/plugin.ts'),
      ],
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(async () => undefined),
      pluginIds: ['codegraphy.typescript'],
      pluginInfos: [{
        plugin: {
          id: 'codegraphy.typescript',
          supportedExtensions: ['.ts'],
        },
      }],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._preAnalyzePlugins).not.toHaveBeenCalled();
    expect(sequence).toEqual(['analyze']);
  });

  it('falls back to full analysis when changed paths no longer match discovered files', async () => {
    const source = createSource();
    const disabledPlugins = new Set<string>();

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      disabledPlugins,
      filePaths: ['/workspace/src/deleted.ts'],
      filterPatterns: ['dist'],
      notifyFilesChanged: vi.fn(),
    }));

    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith(
      ['/workspace/src/deleted.ts'],
      { persist: false },
    );
    expect(source.analyze).toHaveBeenCalledWith(
      ['dist'],
      disabledPlugins,
      undefined,
      expect.any(Function),
    );
  });

  it('falls back to full analysis when plugin file-change hooks request it', async () => {
    const source = createSource();

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      notifyFilesChanged: vi.fn(async () => ({
        additionalFilePaths: [],
        requiresFullRefresh: true,
      })),
    }));

    expect(source.analyze).toHaveBeenCalledOnce();
  });

  it('rebuilds from existing analysis when there are no files left to analyze', async () => {
    const graph: IGraphData = { nodes: [], edges: [] };
    const source = createSource({
      _buildGraphDataFromAnalysis: vi.fn(() => graph),
      _lastFileConnections: new Map(),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [],
      filePaths: ['/outside/src/app.ts'],
    }))).resolves.toBe(graph);
  });

  it('analyzes changed and plugin-added files before persisting metadata', async () => {
    const source = createSource();
    const persistCache = vi.fn();
    const persistIndexMetadata = vi.fn();

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [
        createDiscoveredFile('src/app.ts'),
        createDiscoveredFile('src/generated.ts'),
      ],
      notifyFilesChanged: vi.fn(async () => ({
        additionalFilePaths: ['src/generated.ts'],
        requiresFullRefresh: false,
      })),
      persistCache,
      persistIndexMetadata,
    }));

    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [
        createDiscoveredFile('src/app.ts'),
        createDiscoveredFile('src/generated.ts'),
      ],
      '/workspace',
      expect.any(Function),
      undefined,
      undefined,
      new Set(),
    );
    expect(persistCache).toHaveBeenCalledOnce();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('skips the fallback connections graph build when analysis covers retained files', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts'), createGraphNode('README.md')],
      edges: [],
    };
    const source = createSource({
      _buildGraphDataFromAnalysis: vi.fn(() => graph),
      _lastFileAnalysis: new Map([
        ['README.md', createFileAnalysis('/workspace/README.md')],
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map([
        ['README.md', []],
        ['src/app.ts', []],
      ]),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [
        createDiscoveredFile('README.md'),
        createDiscoveredFile('src/app.ts'),
      ],
    }))).resolves.toEqual(graph);

    expect(source._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      source._lastFileAnalysis,
      '/workspace',
      new Set(),
    );
    expect(source._buildGraphData).not.toHaveBeenCalled();
  });

  it('patches only node metrics when changed-file analysis preserves graph structure', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const patchGraphDataNodeMetrics = vi.fn(() => graph);
    const source = createSource({
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map([
        ['src/app.ts', []],
      ]),
      _patchGraphDataNodeMetrics: patchGraphDataNodeMetrics,
    });
    const previousGraphData = source._lastGraphData;

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      persistIndexMetadata: vi.fn(async () => undefined),
    }))).resolves.toBe(graph);

    expect(patchGraphDataNodeMetrics).toHaveBeenCalledWith(
      previousGraphData,
      ['src/app.ts'],
    );
    expect(source._buildGraphDataFromAnalysis).not.toHaveBeenCalled();
  });

  it('rebuilds the graph when changed-file analysis changes graph structure', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts'), createGraphNode('src/next.ts')],
      edges: [],
    };
    const source = createSource({
      _analyzeFiles: vi.fn(async () => ({
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map([
          ['src/app.ts', createFileAnalysis('/workspace/src/app.changed.ts')],
        ]),
        fileConnections: new Map([
          ['src/app.ts', []],
        ]),
      })),
      _buildGraphDataFromAnalysis: vi.fn(() => graph),
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map([
        ['src/app.ts', []],
      ]) as Map<string, never>,
      _patchGraphDataNodeMetrics: vi.fn(() => ({
        nodes: [createGraphNode('patched')],
        edges: [],
      })),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions())).resolves.toBe(graph);

    expect(source._patchGraphDataNodeMetrics).not.toHaveBeenCalled();
    expect(source._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      source._lastFileAnalysis,
      '/workspace',
      new Set(),
    );
  });
});
