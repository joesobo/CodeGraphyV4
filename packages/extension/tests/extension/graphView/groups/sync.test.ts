import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/contracts';
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
    hiddenPluginGroupIds: new Set<string>(),
    filterPatterns: [],
    ...overrides,
  };
}

describe('graphView/groupSync', () => {
  it('applies loaded group state and recomputes merged groups', () => {
    const recomputeGroups = vi.fn();
    const persistLegacyGroups = vi.fn();
    const clearLegacyGroups = vi.fn();
    const state = createState();
    const groupState: GraphViewGroupState = {
      userGroups: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
      filterPatterns: ['dist/**'],
      hiddenPluginGroupIds: new Set(['plugin:codegraphy.python']),
    };

    applyLoadedGraphViewGroupState(groupState, state, {
      recomputeGroups,
      persistLegacyGroups,
      clearLegacyGroups,
    });

    expect(state.userGroups).toEqual(groupState.userGroups);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect([...state.hiddenPluginGroupIds]).toEqual(['plugin:codegraphy.python']);
    expect(recomputeGroups).toHaveBeenCalledOnce();
    expect(persistLegacyGroups).not.toHaveBeenCalled();
    expect(clearLegacyGroups).not.toHaveBeenCalled();
  });

  it('migrates legacy groups into settings and clears workspace state', () => {
    const legacyGroups: IGroup[] = [
      { id: 'legacy', pattern: 'src/**', color: '#112233' },
    ];
    const persistLegacyGroups = vi.fn();
    const clearLegacyGroups = vi.fn();

    applyLoadedGraphViewGroupState(
      {
        userGroups: legacyGroups,
        filterPatterns: [],
        hiddenPluginGroupIds: new Set<string>(),
        legacyGroupsToMigrate: legacyGroups,
      },
      createState(),
      {
        recomputeGroups: vi.fn(),
        persistLegacyGroups,
        clearLegacyGroups,
      },
    );

    expect(persistLegacyGroups).toHaveBeenCalledWith(legacyGroups);
    expect(clearLegacyGroups).toHaveBeenCalledOnce();
  });
});
