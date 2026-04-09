import { describe, expect, it, vi } from 'vitest';
import type { ISettingsSnapshot } from '../../../../src/shared/settings/snapshot';
import {
  applyGraphViewAllSettingsSnapshot,
  type GraphViewAllSettingsSyncState,
} from '../../../../src/extension/graphView/settings/sync';

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
    showOrphans: false,
    bidirectionalMode: 'combined',
    directionMode: 'arrows',
    directionColor: '#475569',
    folderNodeColor: '#123456',
    nodeColors: { file: '#999999', folder: '#888888' },
    nodeVisibility: { file: true, folder: true },
    edgeVisibility: { imports: true, nests: false },
    edgeColors: { imports: '#777777', nests: '#666666' },
    pluginOrder: ['codegraphy.markdown', 'codegraphy.python'],
    disabledPlugins: ['codegraphy.python'],
    disabledSources: ['codegraphy.markdown:link'],
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
    viewContext: {},
    hiddenPluginGroupIds: new Set<string>(),
    userGroups: [],
    filterPatterns: [],
    ...overrides,
  };
}

describe('graphView/settings/sync', () => {
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

    expect([...state.hiddenPluginGroupIds]).toEqual(['plugin:codegraphy.python']);
    expect(state.userGroups).toEqual(snapshot.legends);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect(recomputeGroups).toHaveBeenCalledOnce();
    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalled();
  });

  it('sends every pre-group settings message before recomputing groups', () => {
    const order: string[] = [];
    const state = createState();
    const snapshot = createSnapshot();

    applyGraphViewAllSettingsSnapshot(snapshot, ['venv/**'], state, {
      sendMessage: message => {
        order.push(message.type);
      },
      recomputeGroups: () => {
        order.push('RECOMPUTE_GROUPS');
      },
      sendGroupsUpdated: () => {
        order.push('SEND_LEGENDS_UPDATED');
      },
    });

    expect(order.slice(0, 7)).toEqual([
      'PHYSICS_SETTINGS_UPDATED',
      'SETTINGS_UPDATED',
      'DIRECTION_SETTINGS_UPDATED',
      'SHOW_LABELS_UPDATED',
      'RECOMPUTE_GROUPS',
      'SEND_LEGENDS_UPDATED',
      'FILTER_PATTERNS_UPDATED',
    ]);
  });

  it('sends every post-group settings message after groups are recomputed', () => {
    const order: string[] = [];
    const state = createState();
    const snapshot = createSnapshot();

    applyGraphViewAllSettingsSnapshot(snapshot, ['venv/**'], state, {
      sendMessage: message => {
        order.push(message.type);
      },
      recomputeGroups: () => {
        order.push('RECOMPUTE_GROUPS');
      },
      sendGroupsUpdated: () => {
        order.push('SEND_LEGENDS_UPDATED');
      },
    });

    expect(order.slice(-3)).toEqual([
      'FILTER_PATTERNS_UPDATED',
      'MAX_FILES_UPDATED',
      'NODE_SIZE_MODE_UPDATED',
    ]);
  });
});
