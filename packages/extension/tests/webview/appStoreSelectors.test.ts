import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppState, useAppActions } from '../../src/webview/appStoreSelectors';
import { graphStore } from '../../src/webview/store';

describe('useAppState', () => {
  beforeEach(() => {
    graphStore.setState({
      graphData: null,
      isLoading: true,
      searchQuery: 'test-query',
      searchOptions: { matchCase: true, wholeWord: false, regex: false },
      groups: [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }],
      showOrphans: false,
      timelineActive: true,
      activePanel: 'settings',
      nodeDecorations: { 'node1': { color: '#ff0000' } },
      edgeDecorations: { 'edge1': { color: '#00ff00' } },
    });
  });

  it('returns the graphData from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.graphData).toBeNull();
  });

  it('returns the isLoading from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns the searchQuery from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.searchQuery).toBe('test-query');
  });

  it('returns the searchOptions from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.searchOptions).toEqual({ matchCase: true, wholeWord: false, regex: false });
  });

  it('returns the groups from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.groups).toEqual([{ id: 'g1', pattern: 'src/**', color: '#ff0000' }]);
  });

  it('returns the showOrphans from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.showOrphans).toBe(false);
  });

  it('returns the timelineActive from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.timelineActive).toBe(true);
  });

  it('returns the activePanel from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.activePanel).toBe('settings');
  });

  it('returns the nodeDecorations from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.nodeDecorations).toEqual({ 'node1': { color: '#ff0000' } });
  });

  it('returns the edgeDecorations from the store', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.edgeDecorations).toEqual({ 'edge1': { color: '#00ff00' } });
  });
});

describe('useAppActions', () => {
  it('returns a setSearchQuery function that updates the store', () => {
    const { result } = renderHook(() => useAppActions());
    result.current.setSearchQuery('new-query');
    expect(graphStore.getState().searchQuery).toBe('new-query');
  });

  it('returns a setSearchOptions function that updates the store', () => {
    const { result } = renderHook(() => useAppActions());
    const newOptions = { matchCase: true, wholeWord: true, regex: true };
    result.current.setSearchOptions(newOptions);
    expect(graphStore.getState().searchOptions).toEqual(newOptions);
  });

  it('returns a setActivePanel function that updates the store', () => {
    const { result } = renderHook(() => useAppActions());
    result.current.setActivePanel('plugins');
    expect(graphStore.getState().activePanel).toBe('plugins');
  });
});
