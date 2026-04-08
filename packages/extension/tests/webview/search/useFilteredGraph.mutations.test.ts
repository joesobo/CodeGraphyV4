import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGraph } from '../../../src/webview/search/useFilteredGraph';
import type { IGraphData } from '../../../src/shared/graph/types';
import type { IGroup } from '../../../src/shared/settings/groups';

const graphA: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#aaa' },
    { id: 'src/util.ts', label: 'util', color: '#bbb' },
  ],
  edges: [{ id: 'e1', from: 'src/App.ts', to: 'src/util.ts' , kind: 'import', sources: [] }],
};

const graphB: IGraphData = {
  nodes: [
    { id: 'src/foo.ts', label: 'foo', color: '#ccc' },
    { id: 'src/bar.ts', label: 'bar', color: '#ddd' },
  ],
  edges: [{ id: 'e2', from: 'src/foo.ts', to: 'src/bar.ts' , kind: 'import', sources: [] }],
};

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('useFilteredGraph dependency array mutations', () => {
  it('recomputes filteredData when graphData changes', () => {
    const { result, rerender } = renderHook(
      ({ graphData }) =>
        useFilteredGraph(graphData, 'App', defaultOptions, [], {}, {}, {}, {}),
      { initialProps: { graphData: graphA as IGraphData | null } },
    );

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts']);

    rerender({ graphData: graphB });

    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('recomputes filteredData when searchQuery changes', () => {
    const { result, rerender } = renderHook(
      ({ query }) =>
        useFilteredGraph(graphA, query, defaultOptions, [], {}, {}, {}, {}),
      { initialProps: { query: 'App' } },
    );

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts']);

    rerender({ query: 'util' });

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/util.ts']);
  });

  it('recomputes filteredData when searchOptions change', () => {
    const { result, rerender } = renderHook(
      ({ options }) =>
        useFilteredGraph(graphA, 'app', options, [], {}, {}, {}, {}),
      { initialProps: { options: { matchCase: false, wholeWord: false, regex: false } } },
    );

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts']);

    rerender({ options: { matchCase: true, wholeWord: false, regex: false } });

    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('recomputes coloredData when groups change', () => {
    const groupsA: IGroup[] = [{ id: 'g1', pattern: '**/*.ts', color: '#ff0000' }];
    const groupsB: IGroup[] = [{ id: 'g2', pattern: '**/*.ts', color: '#00ff00' }];

    const { result, rerender } = renderHook(
      ({ groups }) =>
        useFilteredGraph(graphA, '', defaultOptions, groups, {}, {}, {}, {}),
      { initialProps: { groups: groupsA } },
    );

    expect(result.current.coloredData?.nodes[0]?.color).toBe('#ff0000');

    rerender({ groups: groupsB });

    expect(result.current.coloredData?.nodes[0]?.color).toBe('#00ff00');
  });

  it('recomputes coloredData when filteredData changes due to a new query', () => {
    const groups: IGroup[] = [{ id: 'g1', pattern: '**/*.ts', color: '#ff0000' }];

    const { result, rerender } = renderHook(
      ({ query }) =>
        useFilteredGraph(graphA, query, defaultOptions, groups, {}, {}, {}, {}),
      { initialProps: { query: '' } },
    );

    expect(result.current.coloredData?.nodes).toHaveLength(2);

    rerender({ query: 'App' });

    expect(result.current.coloredData?.nodes).toHaveLength(1);
    expect(result.current.coloredData?.nodes[0]?.id).toBe('src/App.ts');
  });
});
