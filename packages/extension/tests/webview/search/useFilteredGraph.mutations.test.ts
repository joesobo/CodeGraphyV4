import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import type { IGroup } from '../../../src/shared/settings/groups';

const deriveVisibleGraphMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/shared/visibleGraph', () => ({
  deriveVisibleGraph: deriveVisibleGraphMock,
}));

import { useFilteredGraph } from '../../../src/webview/search/useFilteredGraph';

const graphA: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#aaa' },
    { id: 'src/util.ts', label: 'util', color: '#bbb' },
  ],
  edges: [{ id: 'e1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] }],
};

const graphB: IGraphData = {
  nodes: [
    { id: 'src/foo.ts', label: 'foo', color: '#ccc' },
    { id: 'src/bar.ts', label: 'bar', color: '#ddd' },
  ],
  edges: [{ id: 'e2', from: 'src/foo.ts', to: 'src/bar.ts', kind: 'import', sources: [] }],
};

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('useFilteredGraph dependency array mutations', () => {
  beforeEach(() => {
    deriveVisibleGraphMock.mockReset();
    deriveVisibleGraphMock.mockImplementation((graphData: IGraphData | null) => ({
      graphData,
      regexError: null,
    }));
  });

  it('recomputes filteredData when graphData changes', () => {
    const { result, rerender } = renderHook(
      ({ graphData }) =>
        useFilteredGraph(graphData, 'App', defaultOptions, [], {}, {}, {}, []),
      { initialProps: { graphData: graphA as IGraphData | null } },
    );

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts', 'src/util.ts']);

    rerender({ graphData: graphB });

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('recomputes derivation config when searchQuery changes', () => {
    const { rerender } = renderHook(
      ({ query }) =>
        useFilteredGraph(graphA, query, defaultOptions, [], {}, {}, {}, []),
      { initialProps: { query: 'App' } },
    );

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({ search: { query: 'App', options: defaultOptions } }),
    );

    rerender({ query: 'util' });

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({ search: { query: 'util', options: defaultOptions } }),
    );
  });

  it('recomputes derivation config when searchOptions change', () => {
    const { rerender } = renderHook(
      ({ options }) =>
        useFilteredGraph(graphA, 'app', options, [], {}, {}, {}, []),
      { initialProps: { options: { matchCase: false, wholeWord: false, regex: false } } },
    );

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({
        search: { query: 'app', options: { matchCase: false, wholeWord: false, regex: false } },
      }),
    );

    rerender({ options: { matchCase: true, wholeWord: false, regex: false } });

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({
        search: { query: 'app', options: { matchCase: true, wholeWord: false, regex: false } },
      }),
    );
  });

  it('recomputes coloredData when groups change', () => {
    const groupsA: IGroup[] = [{ id: 'g1', pattern: '**/*.ts', color: '#ff0000' }];
    const groupsB: IGroup[] = [{ id: 'g2', pattern: '**/*.ts', color: '#00ff00' }];

    const { result, rerender } = renderHook(
      ({ groups }) =>
        useFilteredGraph(graphA, '', defaultOptions, groups, {}, {}, {}, []),
      { initialProps: { groups: groupsA } },
    );

    expect(result.current.coloredData?.nodes[0]?.color).toBe('#ff0000');

    rerender({ groups: groupsB });

    expect(result.current.coloredData?.nodes[0]?.color).toBe('#00ff00');
  });

  it('recomputes derivation config when showOrphans changes', () => {
    const { rerender } = renderHook(
      ({ showOrphans }) =>
        useFilteredGraph(graphA, '', defaultOptions, [], {}, {}, {}, [], undefined, [], showOrphans),
      { initialProps: { showOrphans: true } },
    );

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({ showOrphans: true }),
    );

    rerender({ showOrphans: false });

    expect(deriveVisibleGraphMock).toHaveBeenLastCalledWith(
      graphA,
      expect.objectContaining({ showOrphans: false }),
    );
  });
});
