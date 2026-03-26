import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGraph } from '../../src/webview/useFilteredGraph';
import type { IGraphData, IGroup } from '../../src/shared/contracts';

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

    expect(result.current.filteredData?.nodes.map((n) => n.id)).toEqual(['src/util.ts']);
  });

  it('provides a regexError for invalid regex queries', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '[invalid', { ...defaultOptions, regex: true }, []),
    );

    expect(result.current.regexError).toBeTruthy();
    expect(result.current.filteredData?.nodes).toHaveLength(0);
  });

  it('applies group colors to the filtered data', () => {
    const groups: IGroup[] = [
      { id: 'grp', pattern: 'src/**', color: '#ff0000' },
    ];

    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, groups),
    );

    expect(result.current.coloredData?.nodes.every((n) => n.color === '#ff0000')).toBe(true);
  });

  it('coloredData is null when filteredData is null', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(null, '', defaultOptions, []),
    );

    expect(result.current.coloredData).toBeNull();
  });

  it('returns all three fields from the hook result', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, []),
    );

    expect(result.current).toHaveProperty('filteredData');
    expect(result.current).toHaveProperty('coloredData');
    expect(result.current).toHaveProperty('regexError');
  });

  it('returns filtered edges that match the search query', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'App', defaultOptions, []),
    );

    // Only 'src/App.ts' matches "App" as a substring in the id
    // Actually "App" matches "App" in both node ids (src/App.ts)
    // but wait, "util" won't match "App", so only the App node is kept
    expect(result.current.filteredData?.edges).toHaveLength(0);
  });

  it('applies group colors to filtered data', () => {
    const groups: IGroup[] = [
      { id: 'grp', pattern: '**/*.ts', color: '#123456' },
    ];

    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'App', defaultOptions, groups),
    );

    expect(result.current.coloredData?.nodes[0].color).toBe('#123456');
  });

  it('returns regexError as null for non-regex search', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, 'test', defaultOptions, []),
    );

    expect(result.current.regexError).toBeNull();
  });
});
