import { describe, expect, it } from 'vitest';
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
    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set<string>(),
      disabledSources: new Set<string>(),
      showOrphans: true,
    });

    expect(edges).toBe(rawGraphData.edges);
  });

  it('keeps source-less edges even when a plugin is disabled', () => {
    const edges = filterGraphViewTimelineEdges(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledSources: new Set<string>(),
      showOrphans: true,
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

  it('returns source-less edges unchanged when they have no provenance to filter', () => {
    const edges = filterGraphViewTimelineEdges({
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
      disabledSources: new Set<string>(),
      showOrphans: true,
    });

    expect(edges).toEqual([
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
