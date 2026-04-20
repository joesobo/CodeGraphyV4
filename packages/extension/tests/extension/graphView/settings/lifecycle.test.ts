import { describe, expect, it, vi } from 'vitest';
import type { ISettingsSnapshot } from '../../../../src/shared/settings/snapshot';
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
    legends: [{ id: 'group', pattern: 'src/**', color: '#112233' }],
    filterPatterns: ['dist/**'],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    showOrphans: false,
    bidirectionalMode: 'combined',
    directionMode: 'arrows',
    directionColor: '#475569',
    nodeColors: { file: '#999999', folder: '#888888' },
    nodeVisibility: { file: true, folder: true },
    edgeVisibility: { imports: true, nests: false },
    pluginOrder: ['codegraphy.markdown', 'codegraphy.python'],
    disabledPlugins: ['codegraphy.python'],
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    nodeSizeMode: 'uniform',
    maxFiles: 500,
    ...overrides,
  };
}

describe('graph view settings lifecycle helper', () => {
  it('sends current settings messages without mutating the view context', () => {
    const viewContext = {};
    const sendMessage = vi.fn();

    sendGraphViewProviderSettings(viewContext as never, {
      getConfiguration: () => ({
        get: vi.fn(<T>(key: string, defaultValue: T) => {
          return defaultValue;
        }),
      }),
      sendMessage,
    });

    expect(sendMessage).toHaveBeenCalled();
  });

  it('captures the full settings snapshot, reapplies state, and sends the grouped messages', () => {
    const sendMessage = vi.fn();
    const recomputeGroups = vi.fn();
    const sendGroupsUpdated = vi.fn();
    const state = {
      viewContext: {},
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

    expect(state.userGroups).toEqual(snapshot.legends);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect(recomputeGroups).toHaveBeenCalledOnce();
    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalled();
  });
});
