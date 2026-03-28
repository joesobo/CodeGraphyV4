import { describe, expect, it, vi } from 'vitest';
import type { ISettingsSnapshot } from '../../../../src/shared/contracts';
import {
  sendGraphViewProviderAllSettings,
  sendGraphViewProviderSettings,
} from '../../../../src/extension/graphView/settings/lifecycle';

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

describe('graph view settings lifecycle helper', () => {
  it('updates folder-node color and sends current settings messages', () => {
    const viewContext = { folderNodeColor: '#000000' };
    const sendMessage = vi.fn();

    sendGraphViewProviderSettings(viewContext as never, {
      getConfiguration: () => ({
        get: vi.fn(<T>(key: string, defaultValue: T) => {
          if (key === 'folderNodeColor') return '#123456' as T;
          return defaultValue;
        }),
      }),
      sendMessage,
    });

    expect(viewContext.folderNodeColor).toBe('#123456');
    expect(sendMessage).toHaveBeenCalled();
  });

  it('captures the full settings snapshot, reapplies state, and sends the grouped messages', () => {
    const sendMessage = vi.fn();
    const recomputeGroups = vi.fn();
    const sendGroupsUpdated = vi.fn();
    const state = {
      viewContext: { folderNodeColor: '#000000' },
      hiddenPluginGroupIds: new Set<string>(),
      userGroups: [],
      filterPatterns: [],
    };
    const snapshot = createSnapshot();

    sendGraphViewProviderAllSettings(state, {
      captureSettingsSnapshot: () => snapshot,
      getPluginFilterPatterns: () => ['venv/**'],
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
