import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAppActions, useAppState } from '../../../../src/webview/app/shell/storeSelectors';
import { graphStore } from '../../../../src/webview/store/state';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const originalState = graphStore.getState();

afterEach(() => {
  act(() => {
    graphStore.setState(originalState);
  });
  vi.restoreAllMocks();
});

describe('app store selectors', () => {
  it('returns the selected app state slices', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    act(() => {
      graphStore.setState({
        graphData,
        isLoading: true,
        searchQuery: 'query',
        searchOptions: { matchCase: true, wholeWord: true, regex: true },
        legends: [{ id: 'group-1', pattern: 'src/**', color: '#ff0000' }],
        showOrphans: false,
        timelineActive: true,
        activePanel: 'plugins',
        depthMode: true,
        nodeDecorations: { 'src/app.ts': { badge: { text: 'A' } } },
        edgeDecorations: { edge1: { opacity: 0.5 } },
      });
    });

    const { result } = renderHook(() => useAppState());

    expect(result.current).toMatchObject({
      graphData,
      isLoading: true,
      searchQuery: 'query',
      searchOptions: { matchCase: true, wholeWord: true, regex: true },
      legends: [{ id: 'group-1', pattern: 'src/**', color: '#ff0000' }],
      showOrphans: false,
      timelineActive: true,
      activePanel: 'plugins',
      depthMode: true,
      activeFilePath: null,
      nodeDecorations: { 'src/app.ts': { badge: { text: 'A' } } },
      edgeDecorations: { edge1: { opacity: 0.5 } },
    });
    expect(result.current.nodeColors).toEqual({});
    expect(result.current.nodeVisibility).toEqual({});
    expect(result.current.edgeVisibility).toEqual({});
    expect(result.current.edgeColors).toEqual({});
    expect(result.current.graphIsIndexing).toBe(false);
    expect(result.current.graphIndexProgress).toBeNull();
  });

  it('returns the search and panel action references', () => {
    const setSearchQuery = vi.fn();
    const setSearchOptions = vi.fn();
    const setActivePanel = vi.fn();
    act(() => {
      graphStore.setState({
        setSearchQuery,
        setSearchOptions,
        setActivePanel,
      });
    });

    const { result } = renderHook(() => useAppActions());

    result.current.setSearchQuery('next query');
    result.current.setSearchOptions({ matchCase: true, wholeWord: false, regex: false });
    result.current.setActivePanel('settings');

    expect(result.current).toEqual({
      setSearchQuery,
      setSearchOptions,
      setActivePanel,
    });
    expect(setSearchQuery).toHaveBeenCalledWith('next query');
    expect(setSearchOptions).toHaveBeenCalledWith({
      matchCase: true,
      wholeWord: false,
      regex: false,
    });
    expect(setActivePanel).toHaveBeenCalledWith('settings');
  });
});
