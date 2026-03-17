/**
 * Tests targeting surviving mutants in useFilteredGraph.ts:
 * - L33:5 ArrayDeclaration: [] (useMemo dependency array for filtering)
 * - L38:5 ArrayDeclaration: [] (useMemo dependency array for coloring)
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGraph } from '../../src/webview/useFilteredGraph';
import type { IGraphData, IGroup } from '../../src/shared/types';

const graphA: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#aaa' },
    { id: 'src/util.ts', label: 'util', color: '#bbb' },
  ],
  edges: [{ id: 'e1', from: 'src/App.ts', to: 'src/util.ts' }],
};

const graphB: IGraphData = {
  nodes: [
    { id: 'src/foo.ts', label: 'foo', color: '#ccc' },
    { id: 'src/bar.ts', label: 'bar', color: '#ddd' },
  ],
  edges: [{ id: 'e2', from: 'src/foo.ts', to: 'src/bar.ts' }],
};

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('useFilteredGraph dependency array mutations', () => {
  it('recomputes filteredData when graphData changes', () => {
    const { result, rerender } = renderHook(
      ({ graphData }) => useFilteredGraph(graphData, 'App', defaultOptions, []),
      { initialProps: { graphData: graphA as IGraphData | null } },
    );

    expect(result.current.filteredData?.nodes.map((n) => n.id)).toEqual(['src/App.ts']);

    rerender({ graphData: graphB });

    // After changing graphData to graphB which has no 'App' node, filteredData should have zero nodes
    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('recomputes filteredData when searchQuery changes', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useFilteredGraph(graphA, query, defaultOptions, []),
      { initialProps: { query: 'App' } },
    );

    expect(result.current.filteredData?.nodes.map((n) => n.id)).toEqual(['src/App.ts']);

    rerender({ query: 'util' });

    expect(result.current.filteredData?.nodes.map((n) => n.id)).toEqual(['src/util.ts']);
  });

  it('recomputes filteredData when searchOptions change', () => {
    const { result, rerender } = renderHook(
      ({ options }) => useFilteredGraph(graphA, 'app', options, []),
      { initialProps: { options: { matchCase: false, wholeWord: false, regex: false } } },
    );

    // Case-insensitive: "app" matches "App"
    expect(result.current.filteredData?.nodes.map((n) => n.id)).toEqual(['src/App.ts']);

    rerender({ options: { matchCase: true, wholeWord: false, regex: false } });

    // Case-sensitive: "app" does NOT match "App"
    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('recomputes coloredData when groups change', () => {
    const groupsA: IGroup[] = [{ id: 'g1', pattern: '**/*.ts', color: '#ff0000' }];
    const groupsB: IGroup[] = [{ id: 'g2', pattern: '**/*.ts', color: '#00ff00' }];

    const { result, rerender } = renderHook(
      ({ groups }) => useFilteredGraph(graphA, '', defaultOptions, groups),
      { initialProps: { groups: groupsA } },
    );

    expect(result.current.coloredData?.nodes[0].color).toBe('#ff0000');

    rerender({ groups: groupsB });

    expect(result.current.coloredData?.nodes[0].color).toBe('#00ff00');
  });

  it('recomputes coloredData when filteredData changes due to new query', () => {
    const groups: IGroup[] = [{ id: 'g1', pattern: '**/*.ts', color: '#ff0000' }];

    const { result, rerender } = renderHook(
      ({ query }) => useFilteredGraph(graphA, query, defaultOptions, groups),
      { initialProps: { query: '' } },
    );

    // All nodes present and colored
    expect(result.current.coloredData?.nodes).toHaveLength(2);

    rerender({ query: 'App' });

    // Only App node remains in colored data
    expect(result.current.coloredData?.nodes).toHaveLength(1);
    expect(result.current.coloredData?.nodes[0].id).toBe('src/App.ts');
  });
});
