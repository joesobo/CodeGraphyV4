import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
} from '../../../../src/shared/contracts';
import { useDisplayStore } from '../../../../src/webview/components/settingsPanel/display/useDisplayStore';
import { graphStore } from '../../../../src/webview/store';

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    activeViewId: 'codegraphy.connections',
    bidirectionalMode: 'separate',
    directionColor: DEFAULT_DIRECTION_COLOR,
    directionMode: 'arrows',
    folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
    particleSize: 4,
    particleSpeed: 0.005,
    showLabels: true,
    ...overrides,
  });
}

describe('display useDisplayStore', () => {
  it('reads the current display settings from the graph store', () => {
    setStoreState({
      activeViewId: 'codegraphy.folder',
      bidirectionalMode: 'combined',
      directionColor: '#ABCDEF',
      directionMode: 'particles',
      folderNodeColor: '#FF00FF',
      particleSize: 5,
      particleSpeed: 0.001,
      showLabels: false,
    });

    const { result } = renderHook(() => useDisplayStore());

    expect(result.current).toMatchObject({
      activeViewId: 'codegraphy.folder',
      bidirectionalMode: 'combined',
      directionColor: '#ABCDEF',
      directionMode: 'particles',
      folderNodeColor: '#FF00FF',
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
