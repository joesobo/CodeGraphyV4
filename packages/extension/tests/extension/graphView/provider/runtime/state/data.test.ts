import { describe, expect, it } from 'vitest';
import { createGraphViewProviderRuntimeDataState } from '../../../../../../src/extension/graphView/provider/runtime/state/data';

describe('graphView/provider/runtime/state/data', () => {
  it('creates the collection-backed runtime defaults', () => {
    const state = createGraphViewProviderRuntimeDataState();

    expect(state._panels).toEqual([]);
    expect(state._graphData).toEqual({ nodes: [], edges: [] });
    expect(state._changedFilePaths).toEqual([]);
    expect(state._rawGraphData).toEqual({ nodes: [], edges: [] });
    expect(state._viewContext.depthLimit).toBe(1);
    expect(state._groups).toEqual([]);
    expect(state._userGroups).toEqual([]);
    expect(state._filterPatterns).toEqual([]);
    expect(state._disabledPlugins).toEqual(new Set());
  });
});
