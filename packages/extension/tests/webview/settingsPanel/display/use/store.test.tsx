import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDisplayStore } from '../../../../../src/webview/components/settingsPanel/display/use/store';
import { graphStore } from '../../../../../src/webview/store/state';

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    particleSize: 4,
    particleSpeed: 0.005,
    showLabels: true,
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    maxFiles: 500,
    ...overrides,
  });
}

describe('display useDisplayStore', () => {
  it('reads the current display settings from the graph store', () => {
    setStoreState({
      bidirectionalMode: 'combined',
      directionMode: 'particles',
      particleSize: 5,
      particleSpeed: 0.001,
      showLabels: false,
    });

    const { result } = renderHook(() => useDisplayStore());

    expect(result.current).toMatchObject({
      bidirectionalMode: 'combined',
      directionMode: 'particles',
      particleSize: 5,
      particleSpeed: 0.001,
      showLabels: false,
    });
  });

  it('exposes live store setters', () => {
    setStoreState();
    const { result } = renderHook(() => useDisplayStore());

    act(() => {
      result.current.setDirectionMode('none');
      result.current.setShowLabels(false);
    });

    expect(graphStore.getState().directionMode).toBe('none');
    expect(graphStore.getState().showLabels).toBe(false);
  });
});
