import { describe, expect, it, vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  refreshWorkspaceIndexAnalysisScope,
  refreshWorkspaceIndexPluginFiles,
} from '../../src/indexing/refresh';

function createDiscoveredFile(relativePath: string) {
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: relativePath.slice(relativePath.lastIndexOf('.')),
    name: relativePath.split('/').pop() ?? relativePath,
    relativePath,
  };
}

function createSource() {
  return {
    _analyzeFiles: vi.fn(async () => ({
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis: new Map<string, IFileAnalysisResult>([
        ['src/plugin.ts', {
          filePath: '/workspace/src/plugin.ts',
          relations: [],
        }],
      ]),
      fileConnections: new Map([
        ['src/plugin.ts', []],
      ]),
    })),
    _preAnalyzePlugins: vi.fn(async () => undefined),
    _buildGraphData: vi.fn((fileConnections: Map<string, unknown[]>) => ({
      nodes: [...fileConnections.keys()].map(id => ({ id })),
      edges: [],
    })),
    _buildGraphDataFromAnalysis: vi.fn((fileAnalysis: Map<string, IFileAnalysisResult>) => ({
      nodes: [...fileAnalysis.keys()].map(id => ({ id })),
      edges: [],
    })),
    _lastDiscoveredDirectories: ['src'],
    _lastDiscoveredFiles: [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/plugin.ts'),
      createDiscoveredFile('src/plain.txt'),
    ],
    _lastFileAnalysis: new Map<string, IFileAnalysisResult>(),
    _lastFileConnections: new Map<string, unknown[]>([
      ['README.md', []],
      ['src/plugin.ts', []],
      ['src/plain.txt', []],
    ]),
    _lastWorkspaceRoot: '/workspace',
    _readAnalysisFiles: vi.fn(),
    analyze: vi.fn(),
    invalidateWorkspaceFiles: vi.fn(),
  };
}

describe('indexing/refresh', () => {
  it('pre-analyzes plugins before refreshing the analysis scope', async () => {
    const source = createSource();
    const sequence: string[] = [];
    source._preAnalyzePlugins.mockImplementation(async () => {
      sequence.push('pre-analyze');
    });
    source._analyzeFiles.mockImplementation(async () => {
      sequence.push('analyze');
      return {
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map<string, IFileAnalysisResult>(),
        fileConnections: new Map(),
      };
    });
    const discoveredFiles = [createDiscoveredFile('src/plugin.ts')];

    await refreshWorkspaceIndexAnalysisScope(source as never, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles,
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(async () => undefined),
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._preAnalyzePlugins).toHaveBeenCalledWith(
      discoveredFiles,
      '/workspace',
      undefined,
    );
    expect(sequence).toEqual(['pre-analyze', 'analyze']);
  });

  it('keeps discovered file nodes when refreshing plugin data from a discover-only graph', async () => {
    const source = createSource();
    const discoveredFiles = [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/plugin.ts'),
      createDiscoveredFile('src/plain.txt'),
    ];

    const graph = await refreshWorkspaceIndexPluginFiles(source as never, {
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
    );
    expect(graph.nodes.map(node => node.id)).toEqual([
      'src/plugin.ts',
      'README.md',
      'src/plain.txt',
    ]);
  });

  it('pre-analyzes plugins before refreshing plugin files', async () => {
    const source = createSource();
    const sequence: string[] = [];
    source._preAnalyzePlugins.mockImplementation(async () => {
      sequence.push('pre-analyze');
    });
    source._analyzeFiles.mockImplementation(async () => {
      sequence.push('analyze');
      return {
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map<string, IFileAnalysisResult>(),
        fileConnections: new Map(),
      };
    });
    const discoveredFiles = [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/plugin.ts'),
    ];

    await refreshWorkspaceIndexPluginFiles(source as never, {
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

    expect(source._preAnalyzePlugins).toHaveBeenCalledWith(
      [createDiscoveredFile('src/plugin.ts')],
      '/workspace',
      undefined,
    );
    expect(sequence).toEqual(['pre-analyze', 'analyze']);
  });
});
