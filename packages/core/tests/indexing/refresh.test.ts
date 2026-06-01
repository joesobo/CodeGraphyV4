import { describe, expect, it, vi } from 'vitest';
import {
  refreshWorkspaceIndexChangedFiles,
  type WorkspaceIndexRefreshDependencies,
  type WorkspaceIndexRefreshSource,
} from '../../src';
import type { IDiscoveredFile } from '../../src/discovery/contracts';
import type { IGraphData } from '../../src/graph/contracts';

function discovered(relativePath: string): IDiscoveredFile {
  const name = relativePath.split('/').at(-1) ?? relativePath;
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: name.includes('.') ? name.slice(name.lastIndexOf('.')) : '',
    name,
    relativePath,
  };
}

function createSource(overrides: Partial<WorkspaceIndexRefreshSource> = {}): WorkspaceIndexRefreshSource {
  const graph: IGraphData = {
    nodes: [{ color: '#808080', id: 'src/app.ts', label: 'app.ts', nodeType: 'file' }],
    edges: [],
  };

  return {
    _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => ({
      cacheHits: 0,
      cacheMisses: files.length,
      fileAnalysis: new Map(files.map(file => [file.absolutePath, {
        filePath: file.absolutePath,
        relations: [],
      }])),
      fileConnections: new Map(files.map(file => [file.absolutePath, []])),
    })),
    _buildGraphDataFromAnalysis: vi.fn(() => graph),
    _lastDiscoveredFiles: [],
    _lastFileAnalysis: new Map(),
    _lastFileConnections: new Map(),
    _lastWorkspaceRoot: '',
    _readAnalysisFiles: vi.fn(async (files: IDiscoveredFile[]) => files.map(file => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      content: '',
    }))),
    analyze: vi.fn(async () => graph),
    invalidateWorkspaceFiles: vi.fn(() => []),
    ...overrides,
  };
}

function refreshOptions(
  overrides: Partial<WorkspaceIndexRefreshDependencies> = {},
): WorkspaceIndexRefreshDependencies {
  return {
    disabledPlugins: new Set(),
    discoveredFiles: [discovered('src/app.ts')],
    filePaths: ['/workspace/src/app.ts'],
    filterPatterns: [],
    notifyFilesChanged: vi.fn(async () => ({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    })),
    persistCache: vi.fn(),
    persistIndexMetadata: vi.fn(),
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('indexing/refresh', () => {
  it('falls back to full analysis when changed paths no longer match discovered files', async () => {
    const source = createSource();
    const disabledPlugins = new Set<string>();

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      disabledPlugins,
      filePaths: ['/workspace/src/deleted.ts'],
      filterPatterns: ['dist'],
      notifyFilesChanged: vi.fn(),
    }));

    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/deleted.ts']);
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
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      filePaths: ['/outside/src/app.ts'],
    }))).resolves.toBe(graph);
  });

  it('analyzes changed and plugin-added files before persisting metadata', async () => {
    const source = createSource();
    const persistCache = vi.fn();
    const persistIndexMetadata = vi.fn();

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [
        discovered('src/app.ts'),
        discovered('src/generated.ts'),
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
        discovered('src/app.ts'),
        discovered('src/generated.ts'),
      ],
      '/workspace',
      expect.any(Function),
      undefined,
    );
    expect(persistCache).toHaveBeenCalledOnce();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();
  });
});
