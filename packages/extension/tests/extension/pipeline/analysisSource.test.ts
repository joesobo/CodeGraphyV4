import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { createWorkspacePipelineAnalysisSource, createWorkspacePipelineRebuildSource } from '../../../src/extension/pipeline/analysisSource';

describe('pipeline/analysisSource', () => {
  it('adapts analyzer state and delegates for the analysis runner', async () => {
    const analyzer = {
      _eventBus: { emit: vi.fn() },
      _lastDiscoveredFiles: [],
      _lastFileAnalysis: new Map(),
      _lastFileConnections: new Map(),
      _lastWorkspaceRoot: '',
      getPluginFilterPatterns: vi.fn(() => ['**/*.ts']),
      _analyzeFiles: vi.fn(async () => new Map([['a.ts', []]])),
      _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [], edges: [] })),
      _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      _preAnalyzePlugins: vi.fn(async () => undefined),
    };

    const source = createWorkspacePipelineAnalysisSource(analyzer as never);
    const files = [{ path: '/workspace/a.ts' }];

    expect(source.getPluginFilterPatterns()).toEqual(['**/*.ts']);
    await expect(source._preAnalyzePlugins(files as never, '/workspace')).resolves.toBeUndefined();
    await expect(source._analyzeFiles(files as never, '/workspace')).resolves.toEqual(
      new Map([['a.ts', []]]),
    );
    expect(
      source._buildGraphDataFromAnalysis(
        new Map<string, IFileAnalysisResult>([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]),
        '/workspace',
        true,
        new Set(),
      ),
    ).toEqual({ nodes: [], edges: [] });
    expect(
      source._buildGraphData(new Map([['a.ts', []]]), '/workspace', true, new Set()),
    ).toEqual({ nodes: [], edges: [] });

    source._lastDiscoveredFiles = files as never;
    source._lastFileAnalysis = new Map([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]);
    source._lastFileConnections = new Map([['b.ts', []]]);
    source._lastWorkspaceRoot = '/workspace';

    expect(analyzer._lastDiscoveredFiles).toEqual(files);
    expect(analyzer._lastFileAnalysis).toEqual(
      new Map([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]),
    );
    expect(analyzer._lastFileConnections).toEqual(new Map([['b.ts', []]]));
    expect(analyzer._lastWorkspaceRoot).toBe('/workspace');
  });

  it('adapts cached state for rebuild-only graph updates', () => {
    const analyzer = {
      _lastFileAnalysis: new Map([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]),
      _lastFileConnections: new Map([['a.ts', []]]),
      _lastWorkspaceRoot: '/workspace',
      _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [], edges: [] })),
      _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
    };

    const source = createWorkspacePipelineRebuildSource(analyzer as never);

    expect(source._lastFileAnalysis).toEqual(
      new Map([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]),
    );
    expect(source._lastFileConnections).toEqual(new Map([['a.ts', []]]));
    expect(source._lastWorkspaceRoot).toBe('/workspace');
    expect(
      source._buildGraphDataFromAnalysis(
        new Map([['a.ts', { filePath: '/workspace/a.ts', relations: [] }]]),
        '/workspace',
        true,
        new Set(),
      ),
    ).toEqual({ nodes: [], edges: [] });
    expect(
      source._buildGraphData(new Map([['a.ts', []]]), '/workspace', true, new Set()),
    ).toEqual({ nodes: [], edges: [] });
  });
});
