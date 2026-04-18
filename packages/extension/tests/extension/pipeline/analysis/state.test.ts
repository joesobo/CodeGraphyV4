import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../../src/core/plugins/types/contracts';
import {
  clearWorkspacePipelineCache,
  rebuildWorkspacePipelineGraph,
  rebuildWorkspacePipelineGraphForSource,
} from '../../../../src/extension/pipeline/analysis/state';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../../../src/extension/pipeline/cache';

describe('pipeline/analysis/state', () => {
  it('returns an empty graph when rebuilding without cached file connections', () => {
    expect(
      rebuildWorkspacePipelineGraph(
        {
          buildGraphDataFromAnalysis: vi.fn(),
          buildGraphData: vi.fn(),
          fileAnalysis: new Map(),
          fileConnections: new Map(),
          workspaceRoot: '/workspace',
        },
        new Set(),
        true,
      ),
    ).toEqual({ nodes: [], edges: [] });
  });

  it('prefers rebuilding from cached file analysis when it is available', () => {
    const buildGraphDataFromAnalysis = vi.fn(() => ({ nodes: [], edges: [] }));
    const fileAnalysis = new Map<string, IFileAnalysisResult>([
      ['src/index.ts', { filePath: '/workspace/src/index.ts', relations: [] }],
    ]);

    expect(
      rebuildWorkspacePipelineGraph(
        {
          buildGraphDataFromAnalysis,
          buildGraphData: vi.fn(),
          fileAnalysis,
          fileConnections: new Map([['src/index.ts', []]]),
          workspaceRoot: '/workspace',
        },
        new Set(['plugin.python']),
        true,
      ),
    ).toEqual({ nodes: [], edges: [] });

    expect(buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      fileAnalysis,
      '/workspace',
      true,
      new Set(['plugin.python']),
    );
  });

  it('reads rebuild dependencies from the source state', () => {
    expect(
      rebuildWorkspacePipelineGraphForSource(
        {
          _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [], edges: [] })),
          _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
          _lastFileAnalysis: new Map(),
          _lastFileConnections: new Map([['src/index.ts', []]]),
          _lastWorkspaceRoot: '/workspace',
        },
        new Set(['plugin.python']),
        true,
      ),
    ).toEqual({ nodes: [], edges: [] });
  });

  it('creates and persists an empty analysis cache', () => {
    const logInfo = vi.fn();

    const cache = clearWorkspacePipelineCache('/workspace', logInfo);

    expect(cache).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
    expect(logInfo).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
  });
});
