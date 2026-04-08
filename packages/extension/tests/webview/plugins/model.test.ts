import { describe, expect, it } from 'vitest';
import {
  getPluginsPanelItemClassName,
  getPluginsPanelWrapperClassName,
  reorderPluginStatuses,
} from '../../../src/webview/components/plugins/model';
import type { IPluginStatus } from '../../../src/shared/plugins/status';

describe('plugins panel model', () => {
  it('dims disabled plugin rows', () => {
    expect(getPluginsPanelWrapperClassName(false)).toBe('opacity-50');
  });

  it('leaves enabled plugin rows undimmed', () => {
    expect(getPluginsPanelWrapperClassName(true)).toBe('');
  });

  it('highlights the active drop target row', () => {
    expect(getPluginsPanelItemClassName(true, 1, 0, 1)).toContain('ring-1');
  });

  it('reorders plugin statuses by drag indices', () => {
    const plugins: IPluginStatus[] = [
      {
        id: 'plugin.a',
        name: 'A',
        version: '1.0.0',
        supportedExtensions: ['.a'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
        sources: [],
      },
      {
        id: 'plugin.b',
        name: 'B',
        version: '1.0.0',
        supportedExtensions: ['.b'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
        sources: [],
      },
    ];

    expect(reorderPluginStatuses(plugins, 1, 0).map((plugin) => plugin.id)).toEqual([
      'plugin.b',
      'plugin.a',
    ]);
  });
});
