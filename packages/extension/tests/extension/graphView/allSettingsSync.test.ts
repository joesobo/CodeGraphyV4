import { describe, expect, it, vi } from 'vitest';
import type { ISettingsSnapshot } from '../../../src/shared/types';
import {
  applyGraphViewAllSettingsSnapshot,
  type GraphViewAllSettingsSyncState,
} from '../../../src/extension/graphView/allSettingsSync';

function createSnapshot(
  overrides: Partial<ISettingsSnapshot> = {},
): ISettingsSnapshot {
  return {
    physics: {
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
    },
    groups: [{ id: 'group', pattern: 'src/**', color: '#112233' }],
    filterPatterns: ['dist/**'],
    showOrphans: false,
    bidirectionalMode: 'combined',
    directionMode: 'arrows',
    directionColor: '#475569',
    folderNodeColor: '#123456',
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    nodeSizeMode: 'uniform',
    maxFiles: 500,
    hiddenPluginGroups: ['plugin:codegraphy.python'],
    ...overrides,
  };
}

function createState(
  overrides: Partial<GraphViewAllSettingsSyncState> = {},
): GraphViewAllSettingsSyncState {
  return {
    viewContext: { folderNodeColor: '#000000' },
    hiddenPluginGroupIds: new Set<string>(),
    userGroups: [],
    filterPatterns: [],
    ...overrides,
  };
}

describe('graphView/allSettingsSync', () => {
  it('applies the snapshot, recomputes groups, and sends pre/post group messages in order', () => {
    const sendMessage = vi.fn();
    const recomputeGroups = vi.fn();
    const sendGroupsUpdated = vi.fn();
    const state = createState();
    const snapshot = createSnapshot();

    applyGraphViewAllSettingsSnapshot(snapshot, ['venv/**'], state, {
      sendMessage,
      recomputeGroups,
      sendGroupsUpdated,
    });

    expect(state.viewContext.folderNodeColor).toBe('#123456');
    expect([...state.hiddenPluginGroupIds]).toEqual(['plugin:codegraphy.python']);
    expect(state.userGroups).toEqual(snapshot.groups);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect(recomputeGroups).toHaveBeenCalledOnce();
    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalled();
  });
});
