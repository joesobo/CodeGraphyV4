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
  },
  {
    id: 'plugin.markdown',
    name: 'Markdown',
    version: '1.0.0',
    supportedExtensions: ['.md'],
    status: 'active',
    enabled: true,
    connectionCount: 0,
  },
];

describe('graphViewRebuild', () => {
  it('rebuilds when a toggled plugin has graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'plugin.typescript')).toBe(true);
  });

  it('skips a rebuild when a toggled plugin has no graph connections', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'plugin.markdown')).toBe(false);
  });

  it('skips a rebuild when the toggled plugin is unknown', () => {
    expect(shouldRebuildGraphView(pluginStatuses, 'plugin.typescript:missing')).toBe(false);
  });
});
