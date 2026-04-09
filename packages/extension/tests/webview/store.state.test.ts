import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../src/shared/fileColors';
import { createGraphStore } from '../../src/webview/store/state';

describe('GraphStore initial state', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
  });

  it('starts with the expected display defaults', () => {
    const state = store.getState();

    expect(state.bidirectionalMode).toBe('separate');
    expect(state.showOrphans).toBe(true);
    expect(state.directionMode).toBe('arrows');
    expect(state.directionColor).toBe(DEFAULT_DIRECTION_COLOR);
    expect(state.particleSpeed).toBe(0.005);
    expect(state.particleSize).toBe(4);
    expect(state.showLabels).toBe(true);
    expect(state.graphMode).toBe('2d');
    expect(state.nodeSizeMode).toBe('connections');
  });

  it('starts with the expected filtering and view defaults', () => {
    const state = store.getState();

    expect(state.groups).toEqual([]);
    expect(state.filterPatterns).toEqual([]);
    expect(state.pluginFilterPatterns).toEqual([]);
    expect(state.depthLimit).toBe(1);
    expect(state.maxDepthLimit).toBe(10);
    expect(state.dagMode).toBeNull();
    expect(state.maxFiles).toBe(500);
  });

  it('starts with empty plugin decoration and context menu state', () => {
    const state = store.getState();

    expect(state.pluginStatuses).toEqual([]);
    expect(state.nodeDecorations).toEqual({});
    expect(state.edgeDecorations).toEqual({});
    expect(state.pluginContextMenuItems).toEqual([]);
    expect(state.expandedGroupId).toBeNull();
    expect(state.activePanel).toBe('none');
  });
});
