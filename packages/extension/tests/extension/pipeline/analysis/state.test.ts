import { describe, expect, it, vi } from 'vitest';
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
          buildGraphData: vi.fn(),
          fileConnections: new Map(),
          workspaceRoot: '/workspace',
        },
        new Set(),
        new Set(),
        true,
      ),
    ).toEqual({ nodes: [], edges: [] });
  });

  it('reads rebuild dependencies from the source state', () => {
    expect(
      rebuildWorkspacePipelineGraphForSource(
        {
          _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
          _lastFileConnections: new Map([['src/index.ts', []]]),
          _lastWorkspaceRoot: '/workspace',
        },
        new Set(['plugin.typescript:rule']),
        new Set(['plugin.python']),
        true,
      ),
    ).toEqual({ nodes: [], edges: [] });
  });

  it('creates and persists an empty analysis cache', () => {
    const workspaceState = {
      update: vi.fn(() => Promise.resolve()),
    };
    const logInfo = vi.fn();

    const cache = clearWorkspacePipelineCache(workspaceState, logInfo);

    expect(cache).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
    expect(workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.analysisCache',
      cache,
    );
    expect(logInfo).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
  });
});
