import { vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { refreshWorkspacePipelineChangedFiles } from '../../../../../src/extension/pipeline/service/runtime/refresh';

export function createSource() {
  return {
    _analyzeFiles: vi.fn(),
    _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
    _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [{ id: 'node' }], edges: [] })),
    _lastGraphData: {
      nodes: [
        { id: 'src/a.ts', fileSize: 10 },
        { id: 'src/a.ts#run:function', symbol: { filePath: 'src/a.ts' }, fileSize: 10 },
      ],
      edges: [{ from: 'src/a.ts', to: 'src/b.ts', kind: 'import' }],
    },
    _lastDiscoveredDirectories: [] as string[],
    _lastDiscoveredFiles: [] as Array<{ absolutePath: string; relativePath: string }>,
    _lastFileAnalysis: new Map<string, IFileAnalysisResult>(),
    _lastFileConnections: new Map<string, unknown[]>(),
    _lastWorkspaceRoot: '',
    _patchGraphDataNodeMetrics: vi.fn((graphData: IGraphData) => ({
      ...graphData,
      nodes: graphData.nodes.map(node => (
        node.id === 'src/a.ts' || node.symbol?.filePath === 'src/a.ts'
          ? { ...node, fileSize: 12 }
          : node
      )),
    })),
    _readAnalysisFiles: vi.fn(),
    analyze: vi.fn(),
    invalidateWorkspaceFiles: vi.fn(() => []),
  };
}

export function createDependencies() {
  return {
    disabledPlugins: new Set<string>(['plugin.disabled']),
    discoveredFiles: [
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      { absolutePath: '/workspace/src/c.ts', relativePath: 'src/c.ts' },
    ],
    filePaths: ['/workspace/src/a.ts'],
    filterPatterns: ['**/*.ts'],
    notifyFilesChanged: vi.fn(),
    onProgress: vi.fn() as undefined | ((progress: { phase: string; current: number; total: number }) => void),
    persistCache: vi.fn(),
    persistIndexMetadata: vi.fn(async () => undefined),
    signal: new AbortController().signal,
    workspaceRoot: '/workspace',
  };
}


export { refreshWorkspacePipelineChangedFiles };
export type { IFileAnalysisResult, IGraphData };
