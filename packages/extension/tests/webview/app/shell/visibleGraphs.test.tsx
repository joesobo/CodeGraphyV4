import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { useShellVisibleGraphs } from '../../../../src/webview/app/shell/visibleGraphs';

function graphWithNodes(ids: string[]): IGraphData {
  return {
    nodes: ids.map((id) => ({
      id,
      label: id.split('/').pop() ?? id,
      color: '#3B82F6',
      nodeType: 'file',
    })),
    edges: [],
  };
}

function defaultInput(graphData: IGraphData, activeFilterPatterns: string[] = []) {
  return {
    activeFilterPatterns,
    edgeVisibility: {},
    filteredData: graphData,
    graphData,
    graphEdgeTypes: [],
    graphNodeTypes: [],
    nodeVisibility: {},
    searchQuery: '',
    searchOptions: { matchCase: false, regex: false, wholeWord: false },
    showOrphans: true,
  };
}

function nodeIds(graphData: IGraphData | null | undefined): string[] {
  return graphData?.nodes.map((node) => node.id) ?? [];
}

describe('webview/app/shell/visibleGraphs', () => {
  it('reuses the already filtered graph when search and filter counts do not need extra projections', () => {
    const graphData = graphWithNodes(['src/app.ts']);
    const filteredData = graphWithNodes(['src/app.ts']);

    const { result } = renderHook(() => useShellVisibleGraphs({
      ...defaultInput(graphData),
      filteredData,
    }));

    expect(result.current.countBaseData).toBe(filteredData);
    expect(result.current.filterVisibleData).toBe(filteredData);
  });

  it('derives baseline and active-filter visible graphs separately', () => {
    const graphData = graphWithNodes(['src/app.ts', 'README.md', 'Stryker was here']);

    const { result } = renderHook(() => useShellVisibleGraphs({
      ...defaultInput(graphData, ['README.md']),
      filteredData: graphWithNodes(['src/app.ts', 'Stryker was here']),
    }));

    expect(nodeIds(result.current.countBaseData)).toEqual([
      'src/app.ts',
      'README.md',
      'Stryker was here',
    ]);
    expect(nodeIds(result.current.filterVisibleData)).toEqual([
      'src/app.ts',
      'Stryker was here',
    ]);
  });

  it('recomputes the baseline graph when graph data changes', () => {
    const { result, rerender } = renderHook(
      ({ graphData }) => useShellVisibleGraphs(defaultInput(graphData)),
      { initialProps: { graphData: graphWithNodes(['src/app.ts']) } },
    );

    expect(nodeIds(result.current.countBaseData)).toEqual(['src/app.ts']);

    rerender({ graphData: graphWithNodes(['src/app.ts', 'src/new.ts']) });

    expect(nodeIds(result.current.countBaseData)).toEqual([
      'src/app.ts',
      'src/new.ts',
    ]);
  });

  it('recomputes the filtered graph when active filter patterns change', () => {
    const graphData = graphWithNodes(['src/app.ts', 'README.md']);
    const { result, rerender } = renderHook(
      ({ activeFilterPatterns, filteredData }) => useShellVisibleGraphs({
        ...defaultInput(graphData, activeFilterPatterns),
        filteredData,
      }),
      {
        initialProps: {
          activeFilterPatterns: ['README.md'],
          filteredData: graphWithNodes(['src/app.ts']),
        },
      },
    );

    expect(nodeIds(result.current.filterVisibleData)).toEqual(['src/app.ts']);

    rerender({
      activeFilterPatterns: ['src/app.ts'],
      filteredData: graphWithNodes(['README.md']),
    });

    expect(nodeIds(result.current.filterVisibleData)).toEqual(['README.md']);
  });

  it('reuses the baseline count graph as the filter count graph when search is active without filters', () => {
    const graphData = graphWithNodes(['src/app.ts', 'README.md']);

    const { result } = renderHook(() => useShellVisibleGraphs({
      ...defaultInput(graphData),
      filteredData: graphWithNodes(['src/app.ts']),
      searchQuery: 'app',
    }));

    expect(nodeIds(result.current.countBaseData)).toEqual(['src/app.ts', 'README.md']);
    expect(result.current.filterVisibleData).toBe(result.current.countBaseData);
  });
});
