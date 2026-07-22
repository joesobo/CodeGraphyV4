import { vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../../src/discovery/contracts';
import type { IGraphData } from '../../../src/graph/contracts';
import type {
  WorkspaceIndexRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from '../../../src/indexing/refresh';

export function createDiscoveredFile(relativePath: string): IDiscoveredFile {
  const name = relativePath.split('/').at(-1) ?? relativePath;
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: name.includes('.') ? name.slice(name.lastIndexOf('.')) : '',
    name,
    relativePath,
  };
}

export function createFileAnalysis(filePath: string): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
  };
}

export function createGraphNode(id: string) {
  return {
    id,
    label: id.split('/').at(-1) ?? id,
  };
}

export function createSource(
  overrides: Partial<WorkspaceIndexRefreshSource> = {},
): WorkspaceIndexRefreshSource {
  const graph: IGraphData = {
    nodes: [{ id: 'src/app.ts', label: 'app.ts', nodeType: 'file' }],
    edges: [],
  };

  return {
    _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => ({
      cacheHits: 0,
      cacheMisses: files.length,
      fileAnalysis: new Map(files.map(file => [
        file.relativePath,
        createFileAnalysis(file.absolutePath),
      ])),
      fileConnections: new Map(files.map(file => [file.relativePath, []])),
    })),
    _buildGraphData: vi.fn((fileConnections: Map<string, unknown[]>) => ({
      nodes: [...fileConnections.keys()].map(createGraphNode),
      edges: [],
    })),
    _buildGraphDataFromAnalysis: vi.fn((fileAnalysis: Map<string, IFileAnalysisResult>) => ({
      nodes: [...fileAnalysis.keys()].map(createGraphNode),
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
    ]) as Map<string, never>,
    _lastGraphData: graph,
    _lastWorkspaceRoot: '/workspace',
    _preAnalyzePlugins: vi.fn(async () => undefined),
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

export function refreshOptions(
  overrides: Partial<WorkspaceIndexRefreshDependencies> = {},
): WorkspaceIndexRefreshDependencies {
  return {
    disabledPlugins: new Set(),
    discoveredDirectories: ['src'],
    discoveredFiles: [createDiscoveredFile('src/app.ts')],
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
