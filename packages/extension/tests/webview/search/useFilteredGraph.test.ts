import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGraph } from '../../../src/webview/search/useFilteredGraph';
import type { IGraphData } from '../../../src/shared/graph/types';
import type { IGroup } from '../../../src/shared/settings/groups';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#aaa' },
    { id: 'src/util.ts', label: 'util', color: '#bbb' },
  ],
  edges: [{ id: 'e1', from: 'src/App.ts', to: 'src/util.ts' }],
};

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('useFilteredGraph', () => {
  it('returns the original graph when the query is empty', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, []),
    );

    expect(result.current.filteredData).toBe(sampleGraph);
    expect(result.current.regexError).toBeNull();
  });

  it('returns null filteredData when graphData is null', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(null, '', defaultOptions, []),
    );

    expect(result.current.filteredData).toBeNull();
    expect(result.current.coloredData).toBeNull();
  });

  it('filters nodes that do not match the search query', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'util', defaultOptions, []),
    );

    expect(result.current.filteredData?.nodes.map((node) => node.id)).toEqual(['src/util.ts']);
  });

  it('provides a regexError for invalid regex queries', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '[invalid', { ...defaultOptions, regex: true }, []),
    );

    expect(result.current.regexError).toBeTruthy();
    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('applies group colors to the filtered data', () => {
    const groups: IGroup[] = [{ id: 'grp', pattern: 'src/**', color: '#ff0000' }];

    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, groups),
    );

    expect(result.current.coloredData?.nodes.every((node) => node.color === '#ff0000')).toBe(true);
  });

  it('returns all hook fields', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, []),
    );

    expect(result.current).toHaveProperty('filteredData');
    expect(result.current).toHaveProperty('coloredData');
    expect(result.current).toHaveProperty('regexError');
  });

  it('drops edges whose endpoints do not both match the search query', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'App', defaultOptions, []),
    );

    expect(result.current.filteredData?.edges).toHaveLength(0);
  });

  it('applies group colors after filtering', () => {
    const groups: IGroup[] = [{ id: 'grp', pattern: '**/*.ts', color: '#123456' }];

    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'App', defaultOptions, groups),
    );

    expect(result.current.coloredData?.nodes[0]?.color).toBe('#123456');
  });

  it('returns null regexError for non-regex searches', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'test', defaultOptions, []),
    );

    expect(result.current.regexError).toBeNull();
  });
});
