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
      autoReveal: true,
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

  it('captures reset snapshots from configuration and normalized settings state', () => {
    const snapshot = captureGraphViewSettingsSnapshot(
      createConfig({
        autoReveal: 'focusNoScroll',
        legend: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
        filterPatterns: ['dist/**'],
        showOrphans: false,
        bidirectionalEdges: 'combined',
        directionMode: 'particles',
        directionColor: 'not-a-color',
        nodeColors: { file: '#123123', folder: '#456456' },
        nodeVisibility: { file: true, folder: false },
        edgeVisibility: { imports: true, nests: false },
        legendVisibility: { 'default:fileExtension:ts': false },
        legendOrder: ['default:fileExtension:ts'],
        particleSpeed: 0.02,
        particleSize: 6,
        pluginData: {
          'acme.plugin': { enabled: true },
        },
        showLabels: false,
        maxFiles: 250,
        verboseDiagnostics: true,
      }),
      {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      'churn',
    );

    expect(snapshot).toEqual({
      autoReveal: 'focusNoScroll',
      physics: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
      legends: [{ id: 'user', pattern: 'src/**', color: '#112233' }],
      filterPatterns: ['dist/**'],
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      showOrphans: false,
      bidirectionalMode: 'combined',
      directionMode: 'particles',
      directionColor: DEFAULT_DIRECTION_COLOR,
      nodeColors: { file: '#123123', folder: '#456456' },
      nodeVisibility: { file: true, folder: false },
      edgeVisibility: { imports: true, nests: false },
      legendVisibility: { 'default:fileExtension:ts': false },
      legendOrder: ['default:fileExtension:ts'],
      particleSpeed: 0.02,
      particleSize: 6,
      pluginData: {
        'acme.plugin': { enabled: true },
      },
      showLabels: false,
      maxFiles: 250,
      verboseDiagnostics: true,
      nodeSizeMode: 'churn',
    });
  });

  it('builds the display-settings message set in webview sync order', () => {
    expect(
      buildGraphViewSettingsMessages({
        autoReveal: 'focusNoScroll',
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
        payload: { autoReveal: 'focusNoScroll', bidirectionalEdges: 'combined', showOrphans: false },
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

  it('builds the full settings sync message set from a captured snapshot', () => {
    expect(
      buildGraphViewAllSettingsMessages(
        {
          autoReveal: true,
          physics: {
            repelForce: 10,
            linkDistance: 80,
            linkForce: 0.15,
            damping: 0.7,
            centerForce: 0.1,
          },
          legends: [],
          filterPatterns: ['dist/**'],
          disabledCustomFilterPatterns: [],
          disabledPluginFilterPatterns: [],
          showOrphans: false,
          bidirectionalMode: 'combined',
          directionMode: 'particles',
          directionColor: '#00FF00',
          nodeColors: { file: '#111111' },
          nodeVisibility: { file: true },
          edgeVisibility: { imports: true },
          legendVisibility: {},
          legendOrder: [],
          particleSpeed: 0.02,
          particleSize: 6,
          pluginData: {
            'acme.plugin': { enabled: true },
          },
          showLabels: false,
          maxFiles: 250,
          verboseDiagnostics: true,
          nodeSizeMode: 'churn',
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
          payload: { autoReveal: true, bidirectionalEdges: 'combined', showOrphans: false },
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
      ],
      postGroupMessages: [
        {
          type: 'FILTER_PATTERNS_UPDATED',
          payload: {
            patterns: ['dist/**'],
            pluginPatterns: ['venv/**'],
            pluginPatternGroups: [],
            disabledCustomPatterns: [],
            disabledPluginPatterns: [],
          },
        },
        {
          type: 'MAX_FILES_UPDATED',
          payload: { maxFiles: 250 },
        },
        {
          type: 'VERBOSE_DIAGNOSTICS_UPDATED',
          payload: { verboseDiagnostics: true },
        },
        {
          type: 'NODE_SIZE_MODE_UPDATED',
          payload: { nodeSizeMode: 'churn' },
        },
        {
          type: 'PLUGIN_DATA_UPDATED',
          payload: { pluginId: 'acme.plugin', data: { enabled: true } },
        },
      ],
    });
  });
});
