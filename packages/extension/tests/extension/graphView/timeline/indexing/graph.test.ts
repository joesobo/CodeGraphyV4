import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { buildGraphViewTimelineGraphData } from '../../../../../src/extension/graphView/timeline/indexing/filtering';

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

describe('graphView/timeline/indexing/filtering', () => {
  it('filters out edges from disabled plugins', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      showOrphans: true,
    });

    expect(graphData.edges).toEqual([
      {
        id: 'src/c.ts->src/b.ts#import',
        from: 'src/c.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [{ id: 'codegraphy.python:import', pluginId: 'codegraphy.python', sourceId: 'import', label: 'Import' }],
      },
    ]);
  });

  it('keeps all nodes when showOrphans is enabled', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      showOrphans: true,
    });

    expect(graphData.nodes).toBe(rawGraphData.nodes);
    expect(graphData.nodes.map((node) => node.id)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });

  it('keeps edges when only source ids would previously have been disabled', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set<string>(),
      showOrphans: true,
    });

    expect(graphData.edges).toEqual([
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
    ]);
  });

  it('drops orphaned nodes when showOrphans is disabled', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      showOrphans: false,
    });

    expect(graphData.nodes.map((node) => node.id)).toEqual(['src/b.ts', 'src/c.ts']);
  });

  it('returns the original edge array when no plugin or rule filters are disabled', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set<string>(),
      showOrphans: true,
    });

    expect(graphData.edges).toBe(rawGraphData.edges);
  });

  it('keeps source-less edges when plugin provenance is missing', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      showOrphans: true,
      });

    expect(graphData.edges).toEqual([
      {
        id: 'src/c.ts->src/b.ts#import',
        from: 'src/c.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [{ id: 'codegraphy.python:import', pluginId: 'codegraphy.python', sourceId: 'import', label: 'Import' }],
      },
    ]);
  });

  it('returns source-less edges unchanged when they cannot be attributed', () => {
    const graphData = buildGraphViewTimelineGraphData({
      ...rawGraphData,
      edges: [
        ...rawGraphData.edges,
        {
          id: 'src/a.ts->src/c.ts#reference',
          from: 'src/a.ts',
          to: 'src/c.ts',
          kind: 'reference',
          sources: [],
        },
      ],
    }, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      showOrphans: true,
    });

    expect(graphData.edges).toEqual([
      {
        id: 'src/c.ts->src/b.ts#import',
        from: 'src/c.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [{ id: 'codegraphy.python:import', pluginId: 'codegraphy.python', sourceId: 'import', label: 'Import' }],
      },
      {
        id: 'src/a.ts->src/c.ts#reference',
        from: 'src/a.ts',
        to: 'src/c.ts',
        kind: 'reference',
        sources: [],
      },
    ]);
  });
});
