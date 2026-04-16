import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import {
  createDefaultEdgeColors,
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../../src/shared/graphControls/defaults';
import { createDefaultCodeGraphyRepoSettings } from '../../../src/extension/repoSettings/defaults';

describe('extension/repoSettings/defaults', () => {
  it('builds the full repo settings defaults', () => {
    expect(createDefaultCodeGraphyRepoSettings()).toEqual({
      version: 1,
      maxFiles: 500,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      plugins: [],
      pluginOrder: [],
      disabledPlugins: [],
      nodeColors: createDefaultNodeColors(),
      nodeVisibility: createDefaultNodeVisibility(),
      edgeVisibility: createDefaultEdgeVisibility(),
      edgeColors: createDefaultEdgeColors(),
      favorites: [],
      bidirectionalEdges: 'separate',
      legend: [],
      filterPatterns: [],
      showLabels: true,
      directionMode: 'arrows',
      directionColor: DEFAULT_DIRECTION_COLOR,
      particleSpeed: 0.005,
      particleSize: 4,
      depthMode: false,
      depthLimit: 1,
      dagMode: null,
      nodeSizeMode: 'connections',
      physics: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
        chargeRange: 200,
      },
      timeline: {
        maxCommits: 500,
        playbackSpeed: 1,
      },
    });
  });

  it('returns fresh nested collections on each call', () => {
    const first = createDefaultCodeGraphyRepoSettings();
    const second = createDefaultCodeGraphyRepoSettings();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.include).not.toBe(first.include);
    expect(second.plugins).not.toBe(first.plugins);
    expect(second.pluginOrder).not.toBe(first.pluginOrder);
    expect(second.disabledPlugins).not.toBe(first.disabledPlugins);
    expect(second.nodeColors).not.toBe(first.nodeColors);
    expect(second.nodeVisibility).not.toBe(first.nodeVisibility);
    expect(second.edgeVisibility).not.toBe(first.edgeVisibility);
    expect(second.edgeColors).not.toBe(first.edgeColors);
    expect(second.legend).not.toBe(first.legend);
    expect(second.filterPatterns).not.toBe(first.filterPatterns);
    expect(second.physics).not.toBe(first.physics);
    expect(second.timeline).not.toBe(first.timeline);
  });
});
