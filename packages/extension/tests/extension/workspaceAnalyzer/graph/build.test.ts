import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspaceAnalyzerGraph,
  buildWorkspaceAnalyzerGraphForSource,
} from '../../../../src/extension/workspaceAnalyzer/graph/build';
import * as workspaceGraphDataModule from '../../../../src/extension/workspaceAnalyzer/graph/data';

function createWorkspaceState(value: Record<string, number>) {
  return {
    get: <T>(_key: string) => value as T,
  };
}

describe('workspaceAnalyzer/graph', () => {
  it('reads visit counts from workspace state before building graph data', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData').mockReturnValue({
      nodes: [],
      edges: [],
    });

    expect(
      buildWorkspaceAnalyzerGraph({
        cacheFiles: {},
        disabledPlugins: new Set<string>(['plugin.python']),
        disabledSources: new Set<string>(['plugin.typescript:rule']),
        fileConnections: new Map([['src/index.ts', []]]),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
        workspaceState: createWorkspaceState({ 'src/index.ts': 3 }),
      }),
    ).toEqual({ nodes: [], edges: [] });

    expect(workspaceGraphDataModule.buildWorkspaceGraphData).toHaveBeenCalledWith({
      cacheFiles: {},
      disabledPlugins: new Set<string>(['plugin.python']),
      disabledSources: new Set<string>(['plugin.typescript:rule']),
      fileConnections: new Map([['src/index.ts', []]]),
      getPluginForFile: expect.any(Function),
      showOrphans: true,
      visitCounts: { 'src/index.ts': 3 },
      workspaceRoot: '/workspace',
    });
  });

  it('builds graph data from the workspace analyzer source state', () => {
    const buildWorkspaceGraphDataSpy = vi
      .spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData')
      .mockReturnValue({ nodes: [], edges: [] });

    expect(
      buildWorkspaceAnalyzerGraphForSource(
        {
          _cache: { files: { 'src/index.ts': { size: 5 } } },
          _context: {
            workspaceState: createWorkspaceState({ 'src/index.ts': 1 }),
          },
          _registry: { getPluginForFile: vi.fn() },
        } as never,
        new Map([['src/index.ts', []]]),
        '/workspace',
        true,
        new Set(),
        new Set(),
      ),
    ).toEqual({ nodes: [], edges: [] });

    expect(buildWorkspaceGraphDataSpy).toHaveBeenCalledOnce();
  });
});
