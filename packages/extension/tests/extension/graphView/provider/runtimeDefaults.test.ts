import { describe, expect, it } from 'vitest';
import {
  createEmptyGraphData,
  createEmptyGroups,
  createInitialViewContext,
  createPluginExtensionUris,
  createStringSet,
  DEFAULT_DEPTH_LIMIT,
  DEFAULT_NODE_SIZE_MODE,
} from '../../../../src/extension/graphView/provider/runtimeDefaults';

describe('graphView/provider/runtimeDefaults', () => {
  it('returns the runtime default constants', () => {
    expect(DEFAULT_DEPTH_LIMIT).toBe(1);
    expect(DEFAULT_NODE_SIZE_MODE).toBe('connections');
  });

  it('creates isolated empty graph, group, set, map, and view-context values', () => {
    const graph = createEmptyGraphData();
    const groups = createEmptyGroups();
    const hiddenPluginGroups = createStringSet();
    const extensionUris = createPluginExtensionUris();
    const viewContext = createInitialViewContext();

    expect(graph).toEqual({ nodes: [], edges: [] });
    expect(groups).toEqual([]);
    expect(hiddenPluginGroups).toEqual(new Set());
    expect(extensionUris).toEqual(new Map());
    expect(viewContext.depthLimit).toBe(DEFAULT_DEPTH_LIMIT);
    expect(viewContext.activePlugins).toEqual(new Set());
  });
});
