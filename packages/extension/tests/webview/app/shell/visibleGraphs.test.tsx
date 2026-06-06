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
    graphData,
    graphEdgeTypes: [],
    graphNodeTypes: [],
    nodeVisibility: {},
    searchOptions: { matchCase: false, regex: false, wholeWord: false },
    showOrphans: true,
  };
}

function nodeIds(graphData: IGraphData | null | undefined): string[] {
  return graphData?.nodes.map((node) => node.id) ?? [];
}

describe('webview/app/shell/visibleGraphs', () => {
  it('derives baseline and active-filter visible graphs separately', () => {
    const graphData = graphWithNodes(['src/app.ts', 'README.md', 'Stryker was here']);

    const { result } = renderHook(() => useShellVisibleGraphs(defaultInput(
      graphData,
      ['README.md'],
    )));

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
      ({ activeFilterPatterns }) => useShellVisibleGraphs(defaultInput(
        graphData,
        activeFilterPatterns,
      )),
      { initialProps: { activeFilterPatterns: ['README.md'] } },
    );

    expect(nodeIds(result.current.filterVisibleData)).toEqual(['src/app.ts']);

    rerender({ activeFilterPatterns: ['src/app.ts'] });

    expect(nodeIds(result.current.filterVisibleData)).toEqual(['README.md']);
  });
});
