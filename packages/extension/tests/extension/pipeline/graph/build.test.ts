import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphForSource,
} from '../../../../src/extension/pipeline/graph/build';
import * as workspaceGraphDataModule from '../../../../src/extension/pipeline/graph/data';

function createWorkspaceState(value: Record<string, number>) {
  return {
    get: <T>(_key: string) => value as T,
  };
}

describe('pipeline/graph', () => {
  it('reads visit counts from workspace state before building graph data', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData').mockReturnValue({
      nodes: [],
      edges: [],
    });

    expect(
      buildWorkspacePipelineGraph({
        cacheFiles: {},
        disabledPlugins: new Set<string>(['plugin.python']),
        fileConnections: new Map([['src/index.ts', []]]),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
        workspaceState: createWorkspaceState({ 'src/index.ts': 3 }),
      }),
    ).toEqual({ nodes: [], edges: [] });

    expect(workspaceGraphDataModule.buildWorkspaceGraphData).toHaveBeenCalledWith({
      cacheFiles: {},
      directoryPaths: [],
      disabledPlugins: new Set<string>(['plugin.python']),
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
      buildWorkspacePipelineGraphForSource(
        {
          _cache: { files: { 'src/index.ts': { size: 5 } } },
          _context: {
            workspaceState: createWorkspaceState({ 'src/index.ts': 1 }),
          },
          _lastDiscoveredDirectories: ['src/new-folder'],
          _registry: { getPluginForFile: vi.fn() },
        } as never,
        new Map([['src/index.ts', []]]),
        '/workspace',
        true,
        new Set(),
      ),
    ).toEqual({ nodes: [], edges: [] });

    expect(buildWorkspaceGraphDataSpy).toHaveBeenCalledWith({
      cacheFiles: { 'src/index.ts': { size: 5 } },
      directoryPaths: ['src/new-folder'],
      disabledPlugins: new Set(),
      fileConnections: new Map([['src/index.ts', []]]),
      getPluginForFile: expect.any(Function),
      showOrphans: true,
      visitCounts: { 'src/index.ts': 1 },
      workspaceRoot: '/workspace',
    });
  });
});
