import { describe, expect, it } from 'vitest';
import type { IPluginStatus } from '../../../src/shared/plugins/status';
import { shouldRebuildGraphView } from '../../../src/extension/graphView/rebuild';

const pluginStatuses: IPluginStatus[] = [
  {
    id: 'plugin.typescript',
    name: 'TypeScript',
    version: '1.0.0',
    supportedExtensions: ['.ts'],
    status: 'active',
    enabled: true,
    connectionCount: 3,
    sources: [
      {
        id: 'es-import',
        qualifiedSourceId: 'plugin.typescript:es-import',
        name: 'ES Import',
        description: 'Detects ES imports',
        enabled: true,
        connectionCount: 2,
      },
      {
        id: 'dynamic-import',
        qualifiedSourceId: 'plugin.typescript:dynamic-import',
        name: 'Dynamic import',
        description: 'Detects dynamic imports',
        enabled: true,
        connectionCount: 0,
      },
    ],
  },
  {
    id: 'plugin.markdown',
    name: 'Markdown',
    version: '1.0.0',
    supportedExtensions: ['.md'],
    status: 'active',
    enabled: true,
    connectionCount: 0,
    sources: [],
  },
];

describe('graphViewRebuild', () => {
  it('rebuilds when a toggled plugin has graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'plugin', 'plugin.typescript')).toBe(true);
  });

  it('skips a rebuild when a toggled plugin has no graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'plugin', 'plugin.markdown')).toBe(false);
  });

  it('rebuilds when a toggled rule has graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'rule', 'plugin.typescript:es-import')).toBe(true);
  });

  it('skips a rebuild when a toggled rule has no graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'rule', 'plugin.typescript:dynamic-import')).toBe(false);
  });

  it('skips a rebuild when a toggled rule does not exist in any plugin', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'rule', 'plugin.typescript:missing')).toBe(false);
  });
});
