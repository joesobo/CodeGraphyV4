import { describe, expect, it } from 'vitest';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID } from '@codegraphy-dev/core';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import { DEFAULT_MAX_FILES } from '../../../src/shared/settings/defaults';
import {
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../../src/shared/graphControls/defaults/maps';
import {
  createDefaultCodeGraphyRepoSettings,
  type ICodeGraphyExtensionInterfaceSettings,
} from '../../../src/extension/repoSettings/defaults';

describe('extension/repoSettings/defaults', () => {
  it('builds the full repo settings defaults', () => {
    const extensionData = {
      showFps: false,
      showMinimap: true,
      cssSnippets: {},
      nodeColors: createDefaultNodeColors(),
      favorites: [],
      bidirectionalEdges: 'separate',
      legend: [],
      legendVisibility: {},
      legendOrder: [],
      showLabels: true,
      directionMode: 'arrows',
      directionColor: DEFAULT_DIRECTION_COLOR,
      particleSpeed: 0.005,
      particleSize: 4,
      depthMode: false,
      depthLimit: 1,
      nodeSizeMode: 'connections',
      physics: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 1,
        damping: 0.4,
        centerForce: 0.1,
      },
    } satisfies ICodeGraphyExtensionInterfaceSettings;

    expect(createDefaultCodeGraphyRepoSettings()).toEqual({
      version: 4,
      maxFiles: DEFAULT_MAX_FILES,
      verboseDiagnostics: false,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'enabled' }],
      interfaces: [{ id: 'codegraphy.extension', data: extensionData }],
      pluginData: {},
      nodeVisibility: createDefaultNodeVisibility(),
      edgeVisibility: createDefaultEdgeVisibility(),
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      ...extensionData,
    });
  });

  it('returns fresh nested collections on each call', () => {
    const first = createDefaultCodeGraphyRepoSettings();
    const second = createDefaultCodeGraphyRepoSettings();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.include).not.toBe(first.include);
    expect(second.plugins).not.toBe(first.plugins);
    expect(second.plugins[0]).not.toBe(first.plugins[0]);
    expect(second.interfaces).not.toBe(first.interfaces);
    expect(second.interfaces[0]).not.toBe(first.interfaces[0]);
    expect(second.interfaces[0]?.data).not.toBe(first.interfaces[0]?.data);
    expect(second.pluginData).not.toBe(first.pluginData);
    expect(second.cssSnippets).not.toBe(first.cssSnippets);
    expect(second.nodeColors).not.toBe(first.nodeColors);
    expect(second.nodeVisibility).not.toBe(first.nodeVisibility);
    expect(second.edgeVisibility).not.toBe(first.edgeVisibility);
    expect(second.legend).not.toBe(first.legend);
    expect(second.filterPatterns).not.toBe(first.filterPatterns);
    expect(second.physics).not.toBe(first.physics);
  });
});
