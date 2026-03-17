import { describe, expect, it } from 'vitest';
import {
  buildGraphViewAllSettingsMessages,
  buildGraphViewSettingsMessages,
  captureGraphViewSettingsSnapshot,
} from '../../../../src/extension/graphView/settings';
import { DEFAULT_DIRECTION_COLOR, DEFAULT_FOLDER_NODE_COLOR } from '../../../../src/shared/types';

function createConfig(values: Record<string, unknown>) {
  return {
    get<T>(section: string, defaultValue: T): T {
      return (values[section] as T | undefined) ?? defaultValue;
    },
  };
}

describe('graphView/settings', () => {
  it('captures default snapshot values when graph view configuration is empty', () => {
    const snapshot = captureGraphViewSettingsSnapshot(
      createConfig({}),
      {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      'uniform',
    );

    expect(snapshot).toEqual({
      physics: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      groups: [],
      filterPatterns: [],
      showOrphans: true,
      bidirectionalMode: 'separate',
      directionMode: 'arrows',
      directionColor: DEFAULT_DIRECTION_COLOR,
      folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
      particleSpeed: 0.005,
      particleSize: 4,
      showLabels: true,
      maxFiles: 500,
      hiddenPluginGroups: [],
      nodeSizeMode: 'uniform',
    });
  });

  it('captures reset snapshots from configuration and normalized settings state', () => {
    const snapshot = captureGraphViewSettingsSnapshot(
      createConfig({
        groups: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
        filterPatterns: ['dist/**'],
        showOrphans: false,
        bidirectionalEdges: 'combined',
        directionMode: 'particles',
        directionColor: 'not-a-color',
        folderNodeColor: '#abcdef',
        particleSpeed: 0.02,
        particleSize: 6,
        showLabels: false,
        maxFiles: 250,
        hiddenPluginGroups: ['plugin:codegraphy.typescript'],
      }),
      {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      'access-count',
    );

    expect(snapshot).toEqual({
      physics: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      groups: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
      filterPatterns: ['dist/**'],
      showOrphans: false,
      bidirectionalMode: 'combined',
      directionMode: 'particles',
      directionColor: DEFAULT_DIRECTION_COLOR,
      folderNodeColor: '#ABCDEF',
      particleSpeed: 0.02,
      particleSize: 6,
      showLabels: false,
      maxFiles: 250,
      hiddenPluginGroups: ['plugin:codegraphy.typescript'],
      nodeSizeMode: 'access-count',
    });
  });

  it('builds the display-settings message set in webview sync order', () => {
    expect(
      buildGraphViewSettingsMessages({
        bidirectionalEdges: 'combined',
        showOrphans: false,
        directionMode: 'particles',
        particleSpeed: 0.02,
        particleSize: 6,
        directionColor: '#00FF00',
        folderNodeColor: '#112233',
        showLabels: false,
      }),
    ).toEqual([
      {
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'combined', showOrphans: false },
      },
      {
        type: 'DIRECTION_SETTINGS_UPDATED',
        payload: {
          directionMode: 'particles',
          particleSpeed: 0.02,
          particleSize: 6,
          directionColor: '#00FF00',
        },
      },
      {
        type: 'FOLDER_NODE_COLOR_UPDATED',
        payload: { folderNodeColor: '#112233' },
      },
      {
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: false },
      },
    ]);
  });

  it('builds the full settings sync message set from a captured snapshot', () => {
    expect(
      buildGraphViewAllSettingsMessages(
        {
          physics: {
            repelForce: 10,
            linkDistance: 80,
            linkForce: 0.15,
            damping: 0.7,
            centerForce: 0.1,
          },
          groups: [],
          filterPatterns: ['dist/**'],
          showOrphans: false,
          bidirectionalMode: 'combined',
          directionMode: 'particles',
          directionColor: '#00FF00',
          folderNodeColor: '#112233',
          particleSpeed: 0.02,
          particleSize: 6,
          showLabels: false,
          maxFiles: 250,
          hiddenPluginGroups: [],
          nodeSizeMode: 'access-count',
        },
        ['venv/**'],
      ),
    ).toEqual({
      preGroupMessages: [
        {
          type: 'PHYSICS_SETTINGS_UPDATED',
          payload: {
            repelForce: 10,
            linkDistance: 80,
            linkForce: 0.15,
            damping: 0.7,
            centerForce: 0.1,
          },
        },
        {
          type: 'SETTINGS_UPDATED',
          payload: { bidirectionalEdges: 'combined', showOrphans: false },
        },
        {
          type: 'DIRECTION_SETTINGS_UPDATED',
          payload: {
            directionMode: 'particles',
            particleSpeed: 0.02,
            particleSize: 6,
            directionColor: '#00FF00',
          },
        },
        {
          type: 'FOLDER_NODE_COLOR_UPDATED',
          payload: { folderNodeColor: '#112233' },
        },
        {
          type: 'SHOW_LABELS_UPDATED',
          payload: { showLabels: false },
        },
      ],
      postGroupMessages: [
        {
          type: 'FILTER_PATTERNS_UPDATED',
          payload: { patterns: ['dist/**'], pluginPatterns: ['venv/**'] },
        },
        {
          type: 'MAX_FILES_UPDATED',
          payload: { maxFiles: 250 },
        },
        {
          type: 'NODE_SIZE_MODE_UPDATED',
          payload: { nodeSizeMode: 'access-count' },
        },
      ],
    });
  });
});
