import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import { filterGraphViewTimelineEdges } from '../../../../../src/extension/graphView/timeline/indexing/edgeFiltering';

const rawGraphData: IGraphData = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#111111' },
    { id: 'src/b.ts', label: 'b.ts', color: '#222222' },
    { id: 'src/c.ts', label: 'c.ts', color: '#333333' },
  ],
  edges: [
    {
      id: 'src/a.ts->src/b.ts#import',
      from: 'src/a.ts',
      to: 'src/b.ts',
      kind: 'import',
      sources: [{ id: 'codegraphy.typescript:import', pluginId: 'codegraphy.typescript', sourceId: 'import', label: 'Import' }],
    },
    {
      id: 'src/c.ts->src/b.ts#import',
      from: 'src/c.ts',
      to: 'src/b.ts',
      kind: 'import',
      sources: [{ id: 'codegraphy.python:import', pluginId: 'codegraphy.python', sourceId: 'import', label: 'Import' }],
    },
  ],
};

describe('filterGraphViewTimelineEdges', () => {
  it('filters out edges from disabled plugins', () => {
    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledSources: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: {
        getPluginForFile(filePath) {
          if (filePath.endsWith('src/a.ts')) {
            return { id: 'codegraphy.typescript' };
          }

          return { id: 'codegraphy.python' };
        },
      },
    });

    expect(edges).toEqual([
      {
        id: 'src/c.ts->src/b.ts#import',
        from: 'src/c.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [{ id: 'codegraphy.python:import', pluginId: 'codegraphy.python', sourceId: 'import', label: 'Import' }],
      },
    ]);
  });

  it('filters out edges from disabled sources', () => {
    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set<string>(),
      disabledSources: new Set(['codegraphy.python:import']),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: {
        getPluginForFile() {
          return { id: 'codegraphy.python' };
        },
      },
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [{ id: 'codegraphy.typescript:import', pluginId: 'codegraphy.typescript', sourceId: 'import', label: 'Import' }],
      },
    ]);
  });

  it('returns the original edge array when no plugin or rule filters are disabled', () => {
    const getPluginForFile = vi.fn(() => ({ id: 'codegraphy.typescript' }));

    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set<string>(),
      disabledSources: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: { getPluginForFile },
    });

    expect(edges).toBe(rawGraphData.edges);
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('returns the original edge array when the registry is missing', () => {
    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledSources: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
    });

    expect(edges).toBe(rawGraphData.edges);
  });

  it('returns the original edge array when the workspace root is missing', () => {
    const getPluginForFile = vi.fn(() => ({ id: 'codegraphy.typescript' }));

    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledSources: new Set<string>(),
      showOrphans: true,
      registry: { getPluginForFile },
    });

    expect(edges).toBe(rawGraphData.edges);
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('keeps edges when the registry cannot resolve a plugin for the source file', () => {
    const getPluginForFile = vi.fn((filePath: string) => {
      if (filePath === path.join('/workspace', 'src/a.ts')) {
        return undefined;
      }

      return { id: 'codegraphy.python' };
    });

    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledSources: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: { getPluginForFile },
    });

    expect(edges).toEqual(rawGraphData.edges);
    expect(getPluginForFile).toHaveBeenNthCalledWith(1, path.join('/workspace', 'src/a.ts'));
    expect(getPluginForFile).toHaveBeenNthCalledWith(2, path.join('/workspace', 'src/c.ts'));
  });
});
