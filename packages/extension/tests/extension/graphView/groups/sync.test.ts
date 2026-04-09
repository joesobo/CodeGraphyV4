import { describe, expect, it, vi } from 'vitest';
import {
  applyLoadedGraphViewGroupState,
  type GraphViewGroupSyncState,
} from '../../../../src/extension/graphView/groups/sync';
import type { GraphViewGroupState } from '../../../../src/extension/graphView/groups/state';

function createState(
  overrides: Partial<GraphViewGroupSyncState> = {},
): GraphViewGroupSyncState {
  return {
    userGroups: [],
    filterPatterns: [],
    ...overrides,
  };
}

describe('graphView/groupSync', () => {
  it('applies loaded group state and recomputes merged groups', () => {
    const recomputeGroups = vi.fn();
    const state = createState();
    const groupState: GraphViewGroupState = {
      userGroups: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
      filterPatterns: ['dist/**'],
    };

    applyLoadedGraphViewGroupState(groupState, state, {
      recomputeGroups,
    });

    expect(state.userGroups).toEqual(groupState.userGroups);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect(recomputeGroups).toHaveBeenCalledOnce();
  });
});
