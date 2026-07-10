import { describe, expect, it } from 'vitest';
import {
  buildGraphViewAllSettingsMessages,
  buildGraphViewSettingsMessages,
} from '../../../../src/extension/graphView/settings/messages';
import { captureGraphViewSettingsSnapshot } from '../../../../src/extension/graphView/settings/snapshot';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import { DEFAULT_MAX_FILES } from '../../../../src/shared/settings/defaults';

function createConfig(values: Record<string, unknown>) {
  return {
    get<T>(section: string, defaultValue: T): T {
      return (values[section] as T | undefined) ?? defaultValue;
    },
  };
}

describe('graphView/settings/snapshotMessages', () => {
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
      legends: [],
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      showOrphans: true,
      bidirectionalMode: 'separate',
      directionMode: 'arrows',
      directionColor: DEFAULT_DIRECTION_COLOR,
      nodeColors: {},
      nodeVisibility: {},
      edgeVisibility: {},
      legendVisibility: {},
      legendOrder: [],
      particleSpeed: 0.005,
      particleSize: 4,
      pluginData: {},
      showLabels: true,
      maxFiles: DEFAULT_MAX_FILES,
      verboseDiagnostics: false,
      nodeSizeMode: 'uniform',
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
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: false },
      },
    ]);
  });
});
