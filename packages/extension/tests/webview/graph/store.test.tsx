import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useGraphViewStoreState } from '../../../src/webview/components/graph/store';
import { graphStore } from '../../../src/webview/store/state';

function resetStore(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    activeViewId: 'connections',
    bidirectionalMode: 'separate',
    dagMode: null,
    directionColor: '#22c55e',
    directionMode: 'arrows',
    favorites: new Set<string>(['src/app.ts']),
    graphMode: '2d',
    nodeSizeMode: 'connections',
    particleSize: 2,
    particleSpeed: 0.1,
    physicsPaused: false,
    physicsSettings: {
      centerForce: 0.1,
      damping: 0.7,
      linkDistance: 50,
      linkForce: 0.2,
      repelForce: 50,
    },
    pluginContextMenuItems: [{ index: 0, label: 'Copy Id', pluginId: 'test.plugin', when: 'node' }],
    showLabels: true,
    timelineActive: false,
    ...overrides,
  });
}

describe('graph/store', () => {
  afterEach(() => {
    act(() => {
      resetStore();
    });
  });

  it('reads the graph view store state used by the Graph component', () => {
    act(() => {
      resetStore({
        activeViewId: 'focused-imports',
        directionMode: 'particles',
        graphMode: '3d',
        particleSize: 7,
        particleSpeed: 0.35,
        physicsPaused: true,
        showLabels: false,
        timelineActive: true,
      });
    });

    const { result } = renderHook(() => useGraphViewStoreState());

    expect(result.current).toMatchObject({
      activeViewId: 'focused-imports',
      bidirectionalMode: 'separate',
      dagMode: null,
      directionColor: '#22c55e',
      directionMode: 'particles',
      graphMode: '3d',
      nodeSizeMode: 'connections',
      particleSize: 7,
      particleSpeed: 0.35,
      physicsPaused: true,
      showLabels: false,
      timelineActive: true,
    });
    expect(result.current.favorites).toEqual(new Set(['src/app.ts']));
    expect(result.current.pluginContextMenuItems).toEqual([
      { index: 0, label: 'Copy Id', pluginId: 'test.plugin', when: 'node' },
    ]);
    expect(result.current.setGraphMode).toBeTypeOf('function');
  });
});
