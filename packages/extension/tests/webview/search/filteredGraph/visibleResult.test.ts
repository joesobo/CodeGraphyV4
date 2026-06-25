import { describe, expect, it } from 'vitest';
import type { SearchOptions } from '../../../../src/webview/components/searchBar/field/model';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { createVisibleGraphCache } from '../../../../src/webview/search/filteredGraph/visibleCache';
import { getVisibleGraphResult } from '../../../../src/webview/search/filteredGraph/visibleResult';

describe('webview/search/filteredGraph/visibleResult', () => {
  it('returns and caches an empty visible result when there is no graph data', () => {
    const cache = createVisibleGraphCache();

    const result = getVisibleGraphResult({
      ...createVisibleGraphOptions(),
      cache,
      graphData: null,
      key: 'empty',
    });

    expect(result).toEqual({
      graphData: null,
      regexError: null,
    });
    expect(cache.graphData).toBeNull();
    expect(cache.entries.get('empty')).toBe(result);
  });

  it('derives visible graph data from search and filter settings, then reuses the cached result', () => {
    const cache = createVisibleGraphCache();
    const graphData = createGraphData(['src/app.ts', 'src/util.ts', 'src/hidden.ts']);

    const firstResult = getVisibleGraphResult({
      ...createVisibleGraphOptions(),
      cache,
      filterPatterns: ['src/hidden.ts'],
      graphData,
      key: 'app-only',
      searchQuery: 'app',
    });
    const secondResult = getVisibleGraphResult({
      ...createVisibleGraphOptions(),
      cache,
      filterPatterns: ['src/hidden.ts'],
      graphData,
      key: 'app-only',
      searchQuery: 'app',
    });

    expect(cache.graphData).toBe(graphData);
    expect(firstResult.graphData?.nodes.map((node) => node.id)).toEqual(['src/app.ts']);
    expect(firstResult.graphData?.edges).toEqual([]);
    expect(secondResult).toBe(firstResult);
  });

  it('clears cached visible results when the graph data reference changes', () => {
    const cache = createVisibleGraphCache();
    const firstGraph = createGraphData(['src/app.ts']);
    const secondGraph = createGraphData(['src/component.ts']);

    getVisibleGraphResult({
      ...createVisibleGraphOptions(),
      cache,
      graphData: firstGraph,
      key: 'same-key',
    });
    const secondResult = getVisibleGraphResult({
      ...createVisibleGraphOptions(),
      cache,
      graphData: secondGraph,
      key: 'same-key',
    });

    expect(cache.graphData).toBe(secondGraph);
    expect(secondResult.graphData?.nodes.map((node) => node.id)).toEqual(['src/component.ts']);
  });
});

function createVisibleGraphOptions(): {
  edgeTypes: [];
  edgeVisibility: Record<string, boolean>;
  filterPatterns: readonly string[];
  nodeTypes: [];
  nodeVisibility: Record<string, boolean>;
  searchOptions: SearchOptions;
  searchQuery: string;
  showOrphans: boolean;
} {
  return {
    edgeTypes: [],
    edgeVisibility: {},
    filterPatterns: [],
    nodeTypes: [],
    nodeVisibility: {},
    searchOptions: {
      matchCase: false,
      regex: false,
      wholeWord: false,
    },
    searchQuery: '',
    showOrphans: true,
  };
}

function createGraphData(nodeIds: string[]): IGraphData {
  return {
    nodes: nodeIds.map((id) => ({
      id,
      label: id.split('/').at(-1) ?? id,
      color: '#94a3b8',
    })),
    edges: nodeIds.length > 1
      ? [
          {
            id: `${nodeIds[0]}->${nodeIds[1]}#import`,
            from: nodeIds[0] ?? '',
            to: nodeIds[1] ?? '',
            kind: 'import',
            sources: [],
          },
        ]
      : [],
  };
}
